import type { IHubChannel, ILogger } from "@gd-monorepo/ws-tunnel";
import type { HubConsumerClient } from "./hub-consumer-client";
import type { ConsumerRelay } from "./consumer-relay";

export interface HubConsumerChannelConfig {
  /** `GET /peers` ile presence tazeleme aralığı (ms). */
  presenceRefreshMs?: number;
}

/**
 * HubConsumerChannel — `IHubChannel` uyarlaması (hub-servis consumer).
 *
 * Mevcut domain bileşenleri (`OperationRequester` vb.) `sendControl` +
 * `onControlMessage` üzerinden çalışır; komut REST `/control`, gelen mesajlar
 * WS relay'den akar. Presence `GET /peers` ile tazelenir.
 */
export class HubConsumerChannel implements IHubChannel {
  private presence = new Set<string>();
  private presenceTimer?: ReturnType<typeof setInterval>;

  constructor(
    private readonly client: HubConsumerClient,
    private readonly relay: ConsumerRelay,
    private readonly logger?: ILogger,
    private readonly config: HubConsumerChannelConfig = {},
  ) {}

  /** Relay + presence döngüsünü başlatır (komut). */
  start(): void {
    this.relay.start();
    void this.refreshPresence();
    const interval = this.config.presenceRefreshMs ?? 15_000;
    this.presenceTimer = setInterval(() => void this.refreshPresence(), interval);
  }

  /** Döngüleri durdurur (komut). */
  stop(): void {
    if (this.presenceTimer) clearInterval(this.presenceTimer);
    this.presenceTimer = undefined;
    this.relay.stop();
  }

  /** Presence haritasını hub keşfinden tazeler (komut — sorgu ama yan etkili). */
  async refreshPresence(): Promise<void> {
    try {
      const peers = await this.client.peers();
      this.presence = new Set(
        peers.filter((peer) => peer.status === "connected").map((peer) => peer.peerId),
      );
    } catch (error) {
      void this.logger?.log({
        level: "warn",
        category: "app",
        eventCode: "hub_consumer_presence_failed",
        message: "Hub presence tazelenemedi",
        context: { error: String(error) },
      });
    }
  }

  sendControl(peerId: string, message: unknown): void {
    void this.client.sendControl(peerId, message).catch((error: unknown) => {
      void this.logger?.log({
        level: "warn",
        category: "app",
        eventCode: "hub_consumer_send_failed",
        message: "Hub kontrol mesajı gönderilemedi",
        context: { peerId, error: String(error) },
      });
    });
  }

  sendBinary(): void {
    throw new Error("[HubConsumerChannel] binary frame hub consumer'da desteklenmez");
  }

  onControlMessage(
    subscriber: (peerId: string, message: unknown) => void,
  ): () => void {
    return this.relay.onMessage(subscriber);
  }

  onBinaryFrame(): () => void {
    return () => {};
  }

  isConnected(peerId: string): boolean {
    return this.presence.has(peerId);
  }
}
