import { Result, NotFoundError } from "@gd-monorepo/ws-tunnel";
import type {
  DomainError,
  HubPeerRegistry,
  ServiceAnnouncement,
} from "@gd-monorepo/ws-tunnel";
import type { PeerConnectionTracker } from "../domain/peer-connection-tracker";
import { toPeerSummaries } from "../domain/discovery-view";
import type { PeerSummary } from "../domain/discovery-view";

/** DiscoverPeers — keşif use-case'i (saf sorgular). */
export class DiscoverPeers {
  constructor(
    private readonly registry: HubPeerRegistry,
    private readonly tracker: PeerConnectionTracker,
  ) {}

  peers(): readonly PeerSummary[] {
    return toPeerSummaries(this.registry.peers(), this.tracker.snapshot());
  }

  servicesOf(
    peerId: string,
  ): Result<readonly ServiceAnnouncement[], DomainError> {
    const known = this.registry.peers().some((peer) => peer.peerId === peerId);
    if (!known) {
      return Result.err(
        new NotFoundError("hub.discovery.peer-not-found", "Peer bulunamadi"),
      );
    }
    return Result.ok(this.registry.servicesOf(peerId));
  }
}
