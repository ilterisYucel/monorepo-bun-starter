import { WebSocket } from "ws";
import type { ISqlDatabase } from "@gd-monorepo/core";
import type { PeerConnectionState } from "@gd-monorepo/ws-tunnel";
import { sha256Hex } from "../auth/service-token";

const DDL = `
  CREATE TABLE IF NOT EXISTS field_uplinks (
    field_id   TEXT PRIMARY KEY,
    token_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
  );
`;

interface FieldEntry {
  ws: WebSocket;
  status: PeerConnectionState;
  lastSeenAt: number;
  staleTimer?: ReturnType<typeof setTimeout>;
}

/** FieldRegistry yapılandırması — opsiyonel; testlerde zaman enjekte edilir. */
export interface FieldRegistryOptions {
  /** Heartbeat sessizliği süresi (ms) — aşınca "stale" (varsayılan 45 sn). */
  staleTimeoutMs?: number;
  /** Kapalı soket temizliği sweep aralığı (ms). */
  sweepIntervalMs?: number;
  /** Zaman kaynağı — testlerde deterministik enjekte edilir. */
  now?: () => number;
}

interface RegistryObserver {
  onControlMessage?(fieldId: string, message: unknown): void;
  onBinaryFrame?(fieldId: string, data: Buffer): void;
  onConnectionChange?(fieldId: string, state: PeerConnectionState): void;
}

const DEFAULT_STALE_TIMEOUT_MS = 45000;
const DEFAULT_SWEEP_INTERVAL_MS = 60000;

/**
 * FieldRegistry — boss tier field uplink kayıt defteri (BOSS-UYGULAMA-MIMARISI.md §7.4).
 * Konteyner modelinin üst katman kopyası:
 * - Token: `sha256(token) == field_uplinks.token_hash` (fail-closed).
 * - register → register-ack + connected; heartbeat → lastSeenAt;
 *   45 sn sessizlik → stale; WS kapanırsa idle.
 * - Kontrol/binary frame'leri gözlemcilere (SessionGateway/TunnelProxy) akar.
 */
export class FieldRegistry {
  private fields: Map<string, FieldEntry> = new Map();
  private observers: Set<RegistryObserver> = new Set();
  private sweepTimer?: ReturnType<typeof setInterval>;
  private readonly staleTimeoutMs: number;
  private readonly sweepIntervalMs: number;
  private readonly now: () => number;

  constructor(
    private readonly sql: ISqlDatabase,
    private readonly options: FieldRegistryOptions = {},
  ) {
    this.staleTimeoutMs = options.staleTimeoutMs ?? DEFAULT_STALE_TIMEOUT_MS;
    this.sweepIntervalMs = options.sweepIntervalMs ?? DEFAULT_SWEEP_INTERVAL_MS;
    this.now = options.now ?? (() => Date.now());
  }

  /** Şemayı kurar (komut). */
  async ensureSchema(): Promise<void> {
    await this.sql.execute(DDL);
  }

  /** Field uplink token'ını hash olarak kaydeder (komut — admin saha kaydından). */
  async upsertToken(fieldId: string, token: string): Promise<void> {
    await this.sql.execute(
      `INSERT INTO field_uplinks (field_id, token_hash)
       VALUES ($1, $2)
       ON CONFLICT (field_id)
       DO UPDATE SET token_hash = EXCLUDED.token_hash, updated_at = NOW()`,
      [fieldId, sha256Hex(token)],
    );
  }

  /** Field uplink kaydını siler (komut — admin saha silme). */
  async removeToken(fieldId: string): Promise<void> {
    await this.sql.execute("DELETE FROM field_uplinks WHERE field_id = $1", [
      fieldId,
    ]);
  }

  /** Verilen token'ın hash'i herhangi bir saha satırıyla eşleşiyor mu? */
  async authenticateToken(token: string): Promise<boolean> {
    const row = await this.sql.queryOne<{ n: number }>(
      "SELECT 1 AS n FROM field_uplinks WHERE token_hash = $1 LIMIT 1",
      [sha256Hex(token)],
    );
    return row !== undefined;
  }

  start(): Promise<void> {
    this.sweepTimer = setInterval(() => this.sweep(), this.sweepIntervalMs);
    console.log("[FieldRegistry] Baslatildi");
    return Promise.resolve();
  }

  stop(): Promise<void> {
    if (this.sweepTimer) clearInterval(this.sweepTimer);
    this.sweepTimer = undefined;
    this.fields.forEach((entry) => {
      if (entry.staleTimer) clearTimeout(entry.staleTimer);
      if (entry.ws.readyState === entry.ws.OPEN) entry.ws.close();
    });
    this.fields.clear();
    this.observers.clear();
    console.log("[FieldRegistry] Durduruldu");
    return Promise.resolve();
  }

  /**
   * Register doğrulamalı kayıt (komut) — token hash'i saha satırıyla eşleşmezse
   * reddedilir (fail-closed). Başarıda `register-ack` + connected bildirimi.
   */
  async register(fieldId: string, ws: WebSocket, token?: string): Promise<void> {
    if (!token) {
      this.rejectRegister(fieldId, ws, "missing-token");
      return;
    }
    const row = await this.sql.queryOne<{ n: number }>(
      "SELECT 1 AS n FROM field_uplinks WHERE field_id = $1 AND token_hash = $2 LIMIT 1",
      [fieldId, sha256Hex(token)],
    );
    if (!row) {
      this.rejectRegister(fieldId, ws, "token-mismatch");
      return;
    }

    const existing = this.fields.get(fieldId);
    if (existing) {
      if (existing.staleTimer) clearTimeout(existing.staleTimer);
      existing.ws.close();
      this.fields.delete(fieldId);
    }

    const entry: FieldEntry = {
      ws,
      status: "connected",
      lastSeenAt: this.now(),
    };
    this.fields.set(fieldId, entry);
    this.scheduleStale(fieldId, entry);

    ws.send(
      JSON.stringify({
        type: "register-ack",
        status: "ok",
        serverTime: new Date(this.now()).toISOString(),
      }),
    );
    this.notifyConnectionChange(fieldId, "connected");
    console.log(`[FieldRegistry] Saha kaydedildi: ${fieldId}`);
  }

  unregister(fieldId: string): void {
    const entry = this.fields.get(fieldId);
    if (!entry) return;
    if (entry.staleTimer) clearTimeout(entry.staleTimer);
    this.fields.delete(fieldId);
    this.notifyConnectionChange(fieldId, "idle");
  }

  /** Bağlı mı (sorgu) — SessionGateway limit kontrolü. */
  isConnected(fieldId: string): boolean {
    const entry = this.fields.get(fieldId);
    return entry !== undefined && entry.status === "connected";
  }

  /** Kayıtlı sahaların bağlantı durumları (sorgu). */
  connectionStatus(): Map<string, PeerConnectionState> {
    const status = new Map<string, PeerConnectionState>();
    this.fields.forEach((entry, fieldId) => status.set(fieldId, entry.status));
    return status;
  }

  lastSeenAt(fieldId: string): number | undefined {
    return this.fields.get(fieldId)?.lastSeenAt;
  }

  sendControl(fieldId: string, message: unknown): void {
    const entry = this.fields.get(fieldId);
    if (entry?.ws.readyState === entry?.ws.OPEN) {
      entry.ws.send(JSON.stringify(message));
    }
  }

  sendBinary(fieldId: string, data: Buffer): void {
    const entry = this.fields.get(fieldId);
    if (entry?.ws.readyState === entry?.ws.OPEN) {
      entry.ws.send(data);
    }
  }

  /** Gözlemci ekler — kaldırma fonksiyonu döner (abonelik kurulumu). */
  addObserver(observer: RegistryObserver): () => void {
    this.observers.add(observer);
    return () => this.observers.delete(observer);
  }

  removeObserver(observer: RegistryObserver): void {
    this.observers.delete(observer);
  }

  /** Soket mesaj dağıtıcısı — routes katmanı her WS için kurar (komut). */
  attachSocketHandlers(fieldId: string, ws: WebSocket): void {
    ws.on("message", (raw, isBinary) => {
      if (isBinary) {
        this.notifyBinaryFrame(fieldId, raw as Buffer);
        return;
      }
      let msg: unknown;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return;
      }
      const type = (msg as { type?: unknown }).type;
      if (type === "heartbeat") {
        const entry = this.fields.get(fieldId);
        if (entry) {
          entry.lastSeenAt = this.now();
          if (entry.status === "stale" || entry.status === "idle") {
            entry.status = "connected";
            this.notifyConnectionChange(fieldId, "connected");
          }
          this.scheduleStale(fieldId, entry);
        }
        return;
      }
      this.notifyControlMessage(fieldId, msg);
    });
    ws.on("close", () => {
      const entry = this.fields.get(fieldId);
      if (entry) {
        if (entry.staleTimer) clearTimeout(entry.staleTimer);
        this.fields.delete(fieldId);
        this.notifyConnectionChange(fieldId, "idle");
      }
    });
    ws.on("error", () => {
      const entry = this.fields.get(fieldId);
      if (entry && entry.status === "connected") {
        entry.status = "error";
        this.notifyConnectionChange(fieldId, "error");
      }
    });
  }

  private rejectRegister(fieldId: string, ws: WebSocket, reason: string): void {
    ws.send(
      JSON.stringify({
        type: "register-ack",
        status: "rejected",
        serverTime: new Date(this.now()).toISOString(),
        reason,
      }),
    );
    console.warn(`[FieldRegistry] Register reddedildi: ${fieldId} (${reason})`);
    ws.close();
  }

  private scheduleStale(fieldId: string, entry: FieldEntry): void {
    if (entry.staleTimer) clearTimeout(entry.staleTimer);
    entry.staleTimer = setTimeout(() => {
      if (entry.status === "connected") {
        entry.status = "stale";
        this.notifyConnectionChange(fieldId, "stale");
      }
    }, this.staleTimeoutMs);
  }

  private sweep(): void {
    this.fields.forEach((entry) => {
      if (entry.ws.readyState !== entry.ws.OPEN) {
        entry.ws.terminate();
      }
    });
  }

  private notifyConnectionChange(fieldId: string, state: PeerConnectionState): void {
    this.observers.forEach((observer) => observer.onConnectionChange?.(fieldId, state));
  }

  private notifyControlMessage(fieldId: string, message: unknown): void {
    this.observers.forEach((observer) => observer.onControlMessage?.(fieldId, message));
  }

  private notifyBinaryFrame(fieldId: string, data: Buffer): void {
    this.observers.forEach((observer) => observer.onBinaryFrame?.(fieldId, data));
  }
}
