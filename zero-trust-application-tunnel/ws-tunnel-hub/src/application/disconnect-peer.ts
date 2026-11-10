import type { HubPeerRegistry } from "@gd-monorepo/ws-tunnel";
import type { PeerConnectionTracker } from "../domain/peer-connection-tracker";

/** DisconnectPeer — bağlantı kapanışında kayıt temizliği (use-case). */
export class DisconnectPeer {
  constructor(
    private readonly registry: HubPeerRegistry,
    private readonly tracker: PeerConnectionTracker,
  ) {}

  execute(peerId: string): void {
    this.registry.unregister(peerId);
    this.tracker.markClosed(peerId);
  }
}
