import type { HubConsumerClient } from "./hub-consumer-client";

export interface HubFieldRegistryConfig {
  client: HubConsumerClient;
  /** `GET /peers` presence tazeleme aralığı (ms). */
  presenceRefreshMs?: number;
}

interface PresenceEntry {
  status: string;
  lastSeenAt: number;
}

/**
 * HubFieldRegistry — `FieldRegistry`'nin hub-servis tüketicisi karşılığı.
 *
 * Boss tier'da registry otoritesi artık hub-servis'tir:
 * - Durum/bağlantı: periyodik `GET /peers` (presence cache).
 * - Peer oluşturma: `POST /admin/peers` (tek kullanımlık bootstrap döner).
 * - İptal: `DELETE /admin/peers/:id`.
 * WS/token/SQL taşımaz (bunlar hub-servis'te).
 */
export class HubFieldRegistry {
  private readonly client: HubConsumerClient;
  private readonly refreshMs: number;
  private entries = new Map<string, PresenceEntry>();
  private timer?: ReturnType<typeof setInterval>;
  private now: () => number = () => Date.now();

  constructor(config: HubFieldRegistryConfig) {
    this.client = config.client;
    this.refreshMs = config.presenceRefreshMs ?? 15_000;
  }

  /** Presence döngüsünü başlatır (komut). */
  start(): void {
    void this.refresh();
    this.timer = setInterval(() => void this.refresh(), this.refreshMs);
  }

  /** Döngüyü durdurur (komut). */
  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
  }

  /** `ensureSchema` — hub-servis şemayı yönetir (no-op, uyumluluk). */
  async ensureSchema(): Promise<void> {}

  /** Presence haritasını hub keşfinden tazeler (komut). */
  async refresh(): Promise<void> {
    try {
      const peers = await this.client.peers();
      const timestamp = this.now();
      const next = new Map<string, PresenceEntry>();
      for (const peer of peers) {
        next.set(peer.peerId, {
          status: peer.status,
          lastSeenAt:
            peer.status === "connected"
              ? timestamp
              : (this.entries.get(peer.peerId)?.lastSeenAt ?? timestamp),
        });
      }
      this.entries = next;
    } catch {
      // Hub erişilemez — eski presence korunur (kademeli bozulma).
    }
  }

  /** Peer bağlı mı (sorgu). */
  isConnected(peerId: string): boolean {
    return this.entries.get(peerId)?.status === "connected";
  }

  /** Son görülme (ms epoch) — bilinmiyorsa undefined (sorgu). */
  lastSeenAt(peerId: string): number | undefined {
    return this.entries.get(peerId)?.lastSeenAt;
  }

  /**
   * Admin: peer kimliğini hub'da oluşturur (bootstrap). Tek kullanımlık
   * bootstrap token'ı döner (admin UI'da gösterilir). `_token` artık hub
   * tarafından üretilir — geriye dönük imza uyumu için alınır, kullanılmaz.
   */
  async upsertToken(
    peerId: string,
    _token?: string,
  ): Promise<{ bootstrapToken: string; expiresAt: string }> {
    const issued = await this.client.createPeer(peerId);
    return {
      bootstrapToken: issued.bootstrapToken,
      expiresAt: issued.expiresAt,
    };
  }

  /** Admin: peer kimliğini iptal eder (sorgu — yan etki hub'da). */
  async removeToken(peerId: string): Promise<void> {
    await this.client.revokePeer(peerId);
    this.entries.delete(peerId);
  }
}
