import type { HubPeerRegistry } from "@gd-monorepo/ws-tunnel";
import type { PeerConnectionTracker } from "../domain/peer-connection-tracker";

/** Sağlık durumu DTO'su. */
export interface HealthStatus {
  readonly status: "ok" | "degraded";
  readonly peers: number;
  readonly connectedPeers: number;
}

/** HealthCheck — servis sağlığı use-case'i. */
export class HealthCheck {
  constructor(
    private readonly registry: HubPeerRegistry,
    private readonly tracker: PeerConnectionTracker,
  ) {}

  execute(): HealthStatus {
    const peers = this.registry.peers();
    const connectedPeers = peers.filter((peer) =>
      this.tracker.isConnected(peer.peerId),
    ).length;
    return { status: "ok", peers: peers.length, connectedPeers };
  }
}
