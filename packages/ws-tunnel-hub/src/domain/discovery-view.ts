import type {
  HubPeerRecord,
  PeerConnectionState,
  ServiceAnnouncement,
  TunnelPeerType,
} from "@gd-monorepo/ws-tunnel";

/** Keşif görünümü — peer özeti (DTO). */
export interface PeerSummary {
  readonly peerId: string;
  readonly peerType: TunnelPeerType;
  readonly status: PeerConnectionState;
  readonly services: readonly ServiceAnnouncement[];
}

/** Registry kayıtları + tracker durumlarını keşif görünümüne indirger (saf). */
export function toPeerSummaries(
  peers: readonly HubPeerRecord[],
  statuses: ReadonlyMap<string, PeerConnectionState>,
): PeerSummary[] {
  return peers.map((peer) => ({
    peerId: peer.peerId,
    peerType: peer.peerType,
    status: statuses.get(peer.peerId) ?? "idle",
    services: peer.services,
  }));
}
