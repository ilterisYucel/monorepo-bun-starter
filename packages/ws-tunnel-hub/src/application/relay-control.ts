import { Result, NotFoundError, TransientError } from "@gd-monorepo/ws-tunnel";
import type { DomainError, HubPeerRegistry, IHubChannel } from "@gd-monorepo/ws-tunnel";
import type { IConsumerRelay } from "../domain/ports/consumer-relay";

/**
 * RelayControl — consumer ↔ peer opak kontrol kanalı.
 *
 * `send`: consumer → peer (hub mesajı yorumlamaz).
 * `deliver`: peer → consumer (bilinmeyen kontrol mesajları opak akar).
 */
export class RelayControl {
  constructor(
    private readonly channel: IHubChannel,
    private readonly registry: HubPeerRegistry,
    private readonly relay: IConsumerRelay,
  ) {}

  send(peerId: string, message: unknown): Result<void, DomainError> {
    const known = this.registry.peers().some((peer) => peer.peerId === peerId);
    if (!known) {
      return Result.err(
        new NotFoundError("hub.relay.peer-not-found", "Peer bulunamadi"),
      );
    }
    if (!this.channel.isConnected(peerId)) {
      return Result.err(
        new TransientError("hub.relay.peer-offline", "Peer bagli degil"),
      );
    }
    this.channel.sendControl(peerId, message);
    return Result.okVoid<void, DomainError>();
  }

  deliver(peerId: string, message: unknown): void {
    this.relay.publish(peerId, message);
  }
}
