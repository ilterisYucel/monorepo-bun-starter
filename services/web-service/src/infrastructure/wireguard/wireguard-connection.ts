import type { ISqlDatabase } from "@gd-monorepo/core";
import { NotFoundError } from "@gd-monorepo/result";
import type { ILogger } from "@gd-monorepo/ws-tunnel";
import { WgHostStore } from "./wg-host-store";
import type { WgHost, WgHostInput } from "./wg-host-store";
import { WgQuickDriver } from "./wireguard-driver";
import type { IWireGuardDriver, WireGuardState } from "./wireguard-driver";

/** WireGuardConnection yapılandırması — boss istemci kimliği. */
export interface WireGuardConnectionConfig {
  /** Boss istemci özel anahtarı (secret) — .conf'a yazılır, loglanmaz. */
  clientPrivateKey: string;
  /** Boss istemci adresi (CIDR) — örn. "10.99.0.2/32". */
  clientAddress: string;
  /** Tünel üzerinden yönlendirilecek ağlar. */
  allowedIps: string;
  /** wg-quick .conf dizini. */
  configDir: string;
  /** Bağlantı sonrası saha prob'u bekleme süresi (ms). */
  probeTimeoutMs?: number;
}

const DEFAULT_PROBE_TIMEOUT_MS = 10_000;

/** Host bağlantı durumu — UI rozetini besler. */
export interface WireGuardHostState {
  id: string;
  state: WireGuardState;
  probedAt?: string;
}

/**
 * WireGuardConnection — boss tier WG orkestrasyonu (Faz 4, §7.5 — yedek yol).
 * Host CRUD + connect (driver.up + opsiyonel saha prob'u) + disconnect + status.
 * PSK hiçbir çıktıya girmez; bağlantı hataları kademeli bozulur (state "down").
 */
export class WireGuardConnection {
  private readonly probeTimeoutMs: number;

  constructor(
    private readonly store: WgHostStore,
    private readonly driver: IWireGuardDriver,
    private readonly config: WireGuardConnectionConfig,
    private readonly logger: ILogger | undefined,
  ) {
    this.probeTimeoutMs = config.probeTimeoutMs ?? DEFAULT_PROBE_TIMEOUT_MS;
  }

  /** Şemayı kurar (komut). */
  async ensureSchema(): Promise<void> {
    await this.store.ensureSchema();
  }

  /** Tüm hostlar (sorgu — PSK'sız). */
  hosts(): Promise<WgHost[]> {
    return this.store.list();
  }

  /** Host kaydeder (komut). */
  async saveHost(input: WgHostInput): Promise<WgHost> {
    return this.store.create(input);
  }

  /** Host günceller (komut) — yoksa undefined. */
  async updateHost(id: string, input: Partial<WgHostInput>): Promise<WgHost | undefined> {
    return this.store.update(id, input);
  }

  /** Host siler (komut) — önce bağlantı düşürülür. */
  async removeHost(id: string): Promise<void> {
    const row = await this.store.byIdWithPsk(id);
    if (row) {
      await this.driver.down(row.name);
    }
    await this.store.remove(id);
  }

  /**
   * Bağlan (komut) — driver.up + saha prob'u. Prob başarısızsa bağlantı
   * DÜŞÜRÜLMEZ (WG el sıkışması gecikebilir); durum "down"/"up" sürücüden
   * okunur, prob bilgi amaçlıdır (kademeli bozulma).
   */
  async connect(id: string, probeUrl?: string): Promise<WireGuardHostState> {
    const row = await this.store.byIdWithPsk(id);
    if (!row) {
      throw new NotFoundError("wg.host-not-found", `WgHost yok: ${id}`);
    }
    await this.driver.up({
      name: row.name,
      clientAddress: this.config.clientAddress,
      clientPrivateKey: this.config.clientPrivateKey,
      endpoint: row.endpoint,
      peerPublicKey: row.public_key,
      psk: row.psk,
      allowedIps: this.config.allowedIps,
    });
    if (probeUrl) {
      await this.probe(probeUrl);
    }
    this.log("info", "wg_connected", "WireGuard host baglandi", {
      host: row.name,
    });
    const state = await this.driver.status(row.name);
    return { id, state };
  }

  /** Bağlantıyı düşürür (komut — idempotent). */
  async disconnect(id: string): Promise<WireGuardHostState> {
    const row = await this.store.byIdWithPsk(id);
    if (!row) {
      throw new NotFoundError("wg.host-not-found", `WgHost yok: ${id}`);
    }
    await this.driver.down(row.name);
    this.log("info", "wg_disconnected", "WireGuard host kapatildi", {
      host: row.name,
    });
    return { id, state: "down" };
  }

  /** Bağlantı durumu (sorgu). */
  async status(id: string): Promise<WireGuardHostState> {
    const row = await this.store.byIdWithPsk(id);
    if (!row) {
      throw new NotFoundError("wg.host-not-found", `WgHost yok: ${id}`);
    }
    const state = await this.driver.status(row.name);
    return { id, state };
  }

  private async probe(url: string): Promise<void> {
    try {
      await fetch(url, { signal: AbortSignal.timeout(this.probeTimeoutMs) });
    } catch (error) {
      void error;
    }
  }

  private log(
    level: "info" | "warn",
    eventCode: string,
    message: string,
    context?: Record<string, unknown>,
  ): void {
    if (!this.logger) return;
    void this.logger
      .log({ level, category: "app", eventCode, message, context })
      .catch(() => {});
  }
}

/** Boss tier fabrika — varsayılan WgQuickDriver ile kurulur. */
export function makeWireGuardConnection(
  sql: ISqlDatabase,
  config: WireGuardConnectionConfig,
  logger: ILogger | undefined,
): WireGuardConnection {
  const store = new WgHostStore(sql);
  const driver = new WgQuickDriver({ configDir: config.configDir });
  return new WireGuardConnection(store, driver, config, logger);
}
