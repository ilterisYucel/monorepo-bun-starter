import { WebSocket } from "ws";
import type { TelemetryData } from "@gd-monorepo/shared-types";
import type { ContainerConnectionState, FieldOperationalConfig, RegisterAckMessage, ConfigUpdateMessage, TelemetryQueryMessage } from "@gd-monorepo/ws-tunnel";

import type { IContainerProxy, ContainerObserver } from "@gd-monorepo/platform-container-access";
import type { DownsampleOptions, ISqlDatabase } from "@gd-monorepo/core";
import { TamperLogger } from "@gd-monorepo/tamper-logger";

import { sha256Hex } from "../auth/service-token";

interface ContainerEntry {
  ws: WebSocket;
  url: string;
  latest: TelemetryData[];
  status: ContainerConnectionState;
  lastSeenAt: number;
  staleTimer?: ReturnType<typeof setTimeout>;
}

interface ContainerRegistryRow {
  container_url: string | null;
  token_hash: string | null;
}

/** Bekleyen telemetri sorgusu — telemetry-result/error/timeout ile kapatılır. */
interface PendingQuery {
  resolve: (data: TelemetryData[]) => void;
  timer: ReturnType<typeof setTimeout>;
}

/** ContainerProxy yapılandırması — opsiyonel; testlerde zaman enjekte edilir. */
export interface ContainerProxyOptions {
  /** Heartbeat sessizliği süresi (ms) — aşınca "stale" (tasarım §4.3: 45 sn). */
  staleTimeoutMs?: number;
  /** Kapalı soket temizliği sweep aralığı (ms). */
  sweepIntervalMs?: number;
  /** Zaman kaynağı — testlerde deterministik enjekte edilir. */
  now?: () => number;
  /** Register-ack içine gömülecek operational config (T2.5). */
  operationalConfig?: FieldOperationalConfig;
  /** Faz 5.1: telemetry-query yanıt bekleme süresi (ms) — aşınca boş dizi. */
  queryTimeoutMs?: number;
}

const DEFAULT_STALE_TIMEOUT_MS = 45000;
const DEFAULT_SWEEP_INTERVAL_MS = 60000;
const DEFAULT_QUERY_TIMEOUT_MS = 10000;

/**
 * ContainerProxy — konteyner kayıt defteri (Faz 1) + heartbeat/stale durumu (Faz 2):
 * - Register token doğrulamalıdır: `sha256(token) == field_containers.token_hash`
 *   (sql yoksa fail-closed — register REDDEDİLİR).
 * - URL kaynağı REGISTRY'dir (field_containers.container_url) — self-reported
 *   URL trust edilmez (SSRF yüzeyi).
 * - Düz token yalnızca RAM'de tutulur (historical/health fetch'lerinde header).
 * - Faz 2 T2.4: başarılı register'da `register-ack` gönderilir (FieldConnector
 *   bunu bekler); `heartbeat` frame'i `lastSeenAt`'i tazeler; 45 sn sessizlik →
 *   "stale"; WS kapanırsa → "idle" (kayıt + son telemetri korunur — §12.4).
 * - Faz 2 T2.5: opsiyonel operationalConfig register-ack'e gömülür;
 *   `pushConfigUpdate` canlı config-update frame'i gönderir.
 */
export class ContainerProxy implements IContainerProxy {
  private containers: Map<string, ContainerEntry> = new Map();
  private tokens: Map<string, string> = new Map();
  private observers: Set<ContainerObserver> = new Set();
  private pendingQueries: Map<string, PendingQuery> = new Map();
  private sweepTimer?: ReturnType<typeof setInterval>;
  private readonly sql: ISqlDatabase | undefined;
  private readonly logger: TamperLogger | undefined;
  private readonly staleTimeoutMs: number;
  private readonly sweepIntervalMs: number;
  private readonly operationalConfig: FieldOperationalConfig | undefined;
  private readonly queryTimeoutMs: number;
  private readonly now: () => number;

  // ELEGANT-EXCEPTION: options.now varsayılanı — üretim kodu enjekte etmez;
  // Date.now davranışı korunur (AlertNotifier deseni, core).
  constructor(
    sql?: ISqlDatabase,
    logger?: TamperLogger,
    options: ContainerProxyOptions = {},
  ) {
    this.sql = sql;
    this.logger = logger;
    this.staleTimeoutMs = options.staleTimeoutMs ?? DEFAULT_STALE_TIMEOUT_MS;
    this.sweepIntervalMs = options.sweepIntervalMs ?? DEFAULT_SWEEP_INTERVAL_MS;
    this.operationalConfig = options.operationalConfig;
    this.queryTimeoutMs = options.queryTimeoutMs ?? DEFAULT_QUERY_TIMEOUT_MS;
    this.now = options.now ?? (() => Date.now());
  }

  start(): Promise<void> {
    this.sweepTimer = setInterval(() => this.sweep(), this.sweepIntervalMs);
    console.log("[ContainerProxy] Baslatildi");
    return Promise.resolve();
  }

  stop(): Promise<void> {
    if (this.sweepTimer) clearInterval(this.sweepTimer);
    this.rejectAllQueries();
    this.containers.forEach((entry) => {
      if (entry.staleTimer) clearTimeout(entry.staleTimer);
      if (entry.ws.readyState === entry.ws.OPEN) {
        entry.ws.close();
      }
    });
    this.containers.clear();
    this.tokens.clear();
    this.observers.clear();
    console.log("[ContainerProxy] Durduruldu");
    return Promise.resolve();
  }

  /** Verilen token'ın hash'i registry'de herhangi bir satırla eşleşiyor mu? */
  async authenticateContainerToken(token: string): Promise<boolean> {
    if (!this.sql) return false;
    try {
      const row = await this.sql.queryOne<{ n: number }>(
        "SELECT 1 AS n FROM field_containers WHERE token_hash = $1 LIMIT 1",
        [sha256Hex(token)],
      );
      return row !== undefined;
    } catch {
      return false;
    }
  }

  /** Registry doğrulamalı register — token eşleşmezse bağlantı reddedilir. */
  async registerContainer(
    containerId: string,
    ws: WebSocket,
    token?: string,
  ): Promise<void> {
    if (!this.sql || !token) {
      await this.rejectRegister(containerId, ws, "missing-token");
      return;
    }

    let row: ContainerRegistryRow | undefined;
    try {
      row = await this.sql.queryOne<ContainerRegistryRow>(
        "SELECT container_url, token_hash FROM field_containers WHERE container_id = $1",
        [containerId],
      );
    } catch {
      row = undefined;
    }

    if (!row || !row.token_hash || row.token_hash !== sha256Hex(token)) {
      await this.rejectRegister(containerId, ws, "token-mismatch");
      return;
    }

    const existing = this.containers.get(containerId);
    if (existing) {
      existing.ws.close();
    }

    const entry: ContainerEntry = {
      ws,
      url: row.container_url ?? "",
      latest: [],
      status: "connected",
      lastSeenAt: this.now(),
    };
    this.containers.set(containerId, entry);
    this.tokens.set(containerId, token);

    this.sendRegisterAck(entry);
    this.notifyConnectionChange(containerId, "connected");
    this.scheduleStale(containerId, entry);

    ws.on("message", (raw, isBinary) => {
      // Faz 3: binary frame'ler tünel akış verisidir — observer'a iletilir.
      if (isBinary) {
        this.notifyBinaryFrame(containerId, raw as Buffer);
        return;
      }
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type === "telemetry" && Array.isArray(msg.data)) {
          const telems = msg.data as TelemetryData[];
          const current = this.containers.get(containerId);
          if (current) {
            current.latest = telems;
            this.notifyData(containerId, telems);
          }
        } else if (msg.type === "heartbeat") {
          this.onHeartbeat(containerId);
        } else if (
          msg.type === "telemetry-result" &&
          typeof msg.queryId === "string" &&
          Array.isArray(msg.data)
        ) {
          // Faz 5.1 B2: telemetry-query yanıtı (aynı WS kanalından)
          this.resolveQuery(msg.queryId, msg.data as TelemetryData[]);
        } else if (
          msg.type === "telemetry-query-error" &&
          typeof msg.queryId === "string"
        ) {
          // Faz 5.1 B2: sorgu hatası → boş seri (kademeli bozulma)
          this.resolveQuery(msg.queryId, []);
        } else {
          // Faz 3: tünel kontrol mesajları (open-session-ack, stream-*)
          this.notifyControlMessage(containerId, msg);
        }
      } catch {
        // gecersiz mesajlari yoksay
      }
    });

    ws.on("close", () => {
      this.rejectAllQueries();
      const current = this.containers.get(containerId);
      if (current && current.status !== "idle") {
        current.status = "idle";
        if (current.staleTimer) clearTimeout(current.staleTimer);
        this.notifyConnectionChange(containerId, "idle");
      }
    });

    ws.on("error", () => {
      const current = this.containers.get(containerId);
      if (current && current.status !== "error") {
        current.status = "error";
        this.notifyConnectionChange(containerId, "error");
      }
    });

    console.log(`[ContainerProxy] Konteyner kaydedildi: ${containerId}`);
  }

  unregisterContainer(containerId: string): void {
    const entry = this.containers.get(containerId);
    if (entry) {
      if (entry.staleTimer) clearTimeout(entry.staleTimer);
      if (entry.ws.readyState === entry.ws.OPEN) {
        entry.ws.close();
      }
    }
    this.rejectAllQueries();
    this.containers.delete(containerId);
    this.tokens.delete(containerId);
  }

  latestTelemetry(containerId: string): TelemetryData[] {
    return this.containers.get(containerId)?.latest ?? [];
  }

  /** Son heartbeat zamanı (ms epoch) — hiç alınmadıysa undefined (T2.4). */
  lastSeenAt(containerId: string): number | undefined {
    return this.containers.get(containerId)?.lastSeenAt;
  }

  /** Canlı operational config push (T2.5) — bağlıysa config-update frame'i. */
  pushConfigUpdate(containerId: string, config: FieldOperationalConfig): void {
    const entry = this.containers.get(containerId);
    if (!entry || entry.ws.readyState !== entry.ws.OPEN) return;
    const frame: ConfigUpdateMessage = { type: "config-update", config };
    entry.ws.send(JSON.stringify(frame));
  }

  /** Faz 3: bağlı konteynere kontrol mesajı gönderir (WS açık değilse no-op). */
  sendControl(containerId: string, message: unknown): void {
    const entry = this.containers.get(containerId);
    if (!entry || entry.ws.readyState !== entry.ws.OPEN) return;
    entry.ws.send(JSON.stringify(message));
  }

  /** Faz 3: bağlı konteynere ham binary frame gönderir (WS açık değilse no-op). */
  sendBinary(containerId: string, data: Buffer): void {
    const entry = this.containers.get(containerId);
    if (!entry || entry.ws.readyState !== entry.ws.OPEN) return;
    entry.ws.send(data);
  }

  /**
   * Faz 5.1 B2: tarihsel seri, konteynere `telemetry-query` kontrol frame'iyle
   * sorulur (AYNI outbound WS kanalı — field konteynere HTTP açmaz, R4/R5).
   * Yanıt `telemetry-result` gelince resolve edilir; hata/timeout/kapalı soket
   * durumunda boş dizi (kademeli bozulma — eski HTTP fetch davranışı korunur).
   */
  async historical(
    containerId: string,
    params: Omit<DownsampleOptions, "deviceId">,
  ): Promise<TelemetryData[]> {
    const entry = this.containers.get(containerId);
    if (!entry || entry.ws.readyState !== entry.ws.OPEN) return [];

    const queryId = crypto.randomUUID();
    const frame: TelemetryQueryMessage = {
      type: "telemetry-query",
      queryId,
      from: (params.from ?? new Date(Date.now() - 86400000)).toISOString(),
      to: (params.to ?? new Date()).toISOString(),
      points: params.points ?? 120,
    };

    return await new Promise<TelemetryData[]>((resolve) => {
      const timer = setTimeout(() => {
        this.pendingQueries.delete(queryId);
        resolve([]);
      }, this.queryTimeoutMs);
      this.pendingQueries.set(queryId, { resolve, timer });
      try {
        entry.ws.send(JSON.stringify(frame));
      } catch {
        this.resolveQuery(queryId, []);
      }
    });
  }

  async allHistorical(
    containerIds: string[],
    params: Omit<DownsampleOptions, "deviceId">,
  ): Promise<Record<string, TelemetryData[]>> {
    const results: Record<string, TelemetryData[]> = {};
    await Promise.allSettled(
      containerIds.map(async (id) => {
        results[id] = await this.historical(id, params);
      }),
    );
    return results;
  }

  connectionStatus(): Map<string, ContainerConnectionState> {
    const status = new Map<string, ContainerConnectionState>();
    this.containers.forEach((entry, id) => {
      status.set(id, entry.status);
    });
    return status;
  }

  addObserver(observer: ContainerObserver): void {
    this.observers.add(observer);
  }

  removeObserver(observer: ContainerObserver): void {
    this.observers.delete(observer);
  }

  async health(containerId: string): Promise<boolean> {
    const entry = this.containers.get(containerId);
    if (!entry || !entry.url) return false;

    try {
      const resp = await fetch(`${entry.url}/health`, {
        headers: this.authHeaders(containerId),
      });
      return resp.ok;
    } catch {
      return false;
    }
  }

  containerIds(): string[] {
    return Array.from(this.containers.keys());
  }

  /** RAM'deki düz token ile Authorization header'ı (yalnızca memory'de tutulur). */
  private authHeaders(containerId: string): Record<string, string> {
    const token = this.tokens.get(containerId);
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  /** Faz 5.1 B2: bekleyen sorguyu kapatır — yanıt geldi veya hata bildirildi. */
  private resolveQuery(queryId: string, data: TelemetryData[]): void {
    const pending = this.pendingQueries.get(queryId);
    if (!pending) return;
    clearTimeout(pending.timer);
    this.pendingQueries.delete(queryId);
    pending.resolve(data);
  }

  /** Faz 5.1 B2: tüm bekleyen sorguları boş diziyle kapatır (stop/close). */
  private rejectAllQueries(): void {
    this.pendingQueries.forEach((pending, queryId) => {
      clearTimeout(pending.timer);
      this.pendingQueries.delete(queryId);
      pending.resolve([]);
    });
  }

  /** Başarılı register sonrası register-ack + opsiyonel operational config (T2.5). */
  private sendRegisterAck(entry: ContainerEntry): void {
    if (entry.ws.readyState !== entry.ws.OPEN) return;
    const frame: RegisterAckMessage = {
      type: "register-ack",
      status: "ok",
      serverTime: new Date(this.now()).toISOString(),
      ...(this.operationalConfig !== undefined
        ? { config: this.operationalConfig }
        : {}),
    };
    entry.ws.send(JSON.stringify(frame));
  }

  /**
   * Heartbeat alımı (T2.4): lastSeenAt tazelenir, stale/error → connected
   * geçişi bildirilir; stale zamanlayıcısı yeniden kurulur.
   */
  private onHeartbeat(containerId: string): void {
    const entry = this.containers.get(containerId);
    if (!entry) return;
    entry.lastSeenAt = this.now();
    this.scheduleStale(containerId, entry);
    if (entry.status !== "connected") {
      entry.status = "connected";
      this.notifyConnectionChange(containerId, "connected");
    }
  }

  /**
   * Stale zamanlayıcısı — son liveness işaretinden (register veya heartbeat)
   * `staleTimeoutMs` sonra durum "stale" yapılır; bu sürede yeni heartbeat
   * gelirse zamanlayıcı yeniden kurulur (tasarım §4.3: 45 sn sessizlik = stale).
   */
  private scheduleStale(containerId: string, entry: ContainerEntry): void {
    if (entry.staleTimer) clearTimeout(entry.staleTimer);
    entry.staleTimer = setTimeout(() => {
      const current = this.containers.get(containerId);
      if (
        current &&
        current.status === "connected" &&
        this.now() - current.lastSeenAt >= this.staleTimeoutMs
      ) {
        current.status = "stale";
        this.notifyConnectionChange(containerId, "stale");
      }
    }, this.staleTimeoutMs);
  }

  /** Reddedilen register — register-ack rejected + security logu + kapatma. */
  private async rejectRegister(
    containerId: string,
    ws: WebSocket,
    reason: string,
  ): Promise<void> {
    if (this.logger) {
      try {
        await this.logger.log({
          level: "warn",
          category: "security",
          eventCode: "ws_register_rejected",
          message: "Konteyner register istegi reddedildi",
          context: { containerId, reason },
        });
      } catch {
        // fail-closed: security logu yazılamazsa da bağlantı reddedilir
      }
    }
    if (ws.readyState === ws.OPEN) {
      const frame: RegisterAckMessage = {
        type: "register-ack",
        status: "rejected",
        serverTime: new Date(this.now()).toISOString(),
      };
      ws.send(JSON.stringify(frame));
      ws.close();
    }
  }

  private sweep(): void {
    this.containers.forEach((entry, id) => {
      if (entry.ws.readyState === WebSocket.CLOSED || entry.ws.readyState === WebSocket.CLOSING) {
        if (entry.status !== "idle") {
          entry.status = "idle";
          this.notifyConnectionChange(id, "idle");
        }
      }
    });
  }

  private notifyData(containerId: string, telemetries: TelemetryData[]): void {
    this.observers.forEach((obs) => obs.onData(containerId, telemetries));
  }

  private notifyConnectionChange(
    containerId: string,
    state: ContainerConnectionState,
  ): void {
    this.observers.forEach((obs) => obs.onConnectionChange(containerId, state));
  }

  private notifyControlMessage(containerId: string, message: unknown): void {
    this.observers.forEach((obs) => obs.onControlMessage?.(containerId, message));
  }

  private notifyBinaryFrame(containerId: string, data: Buffer): void {
    this.observers.forEach((obs) => obs.onBinaryFrame?.(containerId, data));
  }
}
