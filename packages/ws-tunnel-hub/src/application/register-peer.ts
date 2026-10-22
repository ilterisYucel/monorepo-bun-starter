import { Result, ForbiddenError, ValidationError } from "@gd-monorepo/ws-tunnel";
import type { DomainError } from "@gd-monorepo/ws-tunnel";
import {
  TUNNEL_PEER_TYPES,
  serviceAnnouncementSchema,
} from "@gd-monorepo/ws-tunnel";
import type {
  HubPeerRegistry,
  ServiceAnnouncement,
  TunnelPeerType,
} from "@gd-monorepo/ws-tunnel";
import type { PeerConnectionTracker } from "../domain/peer-connection-tracker";
import type { AuthenticatePeerToken } from "./authenticate-peer-token";

/** Register girdisi — güvenilmez frame'den gelir; servisler şema ile doğrulanır. */
export interface RegisterPeerInput {
  readonly token: string;
  readonly peerId: string;
  readonly peerType: string;
  readonly services?: unknown;
}

/** Başarılı kayıt sonucu. */
export interface RegisterPeerOutcome {
  readonly peerId: string;
  readonly peerType: TunnelPeerType;
  readonly services: readonly ServiceAnnouncement[];
}

/**
 * RegisterPeer — peer kaydı use-case'i.
 *
 * Token doğrulanır (port), servis duyurusu STRICT/opak doğrulanır, registry +
 * tracker güncellenir. Framework/WS bilmez.
 */
export class RegisterPeer {
  constructor(
    private readonly registry: HubPeerRegistry,
    private readonly tracker: PeerConnectionTracker,
    private readonly authenticate: AuthenticatePeerToken,
  ) {}

  async execute(
    input: RegisterPeerInput,
  ): Promise<Result<RegisterPeerOutcome, DomainError>> {
    const authenticated = await this.authenticate.execute(input.token);
    if (!authenticated) {
      return Result.err(
        new ForbiddenError("hub.register.unauthorized", "Peer token gecersiz"),
      );
    }
    if (!isPeerType(input.peerType)) {
      return Result.err(
        new ValidationError(
          "hub.register.bad-peer-type",
          `Gecersiz peerType: ${input.peerType}`,
        ),
      );
    }
    const services = parseServices(input.services);
    if (services === undefined) {
      return Result.err(
        new ValidationError(
          "hub.register.bad-services",
          "Servis duyurusu gecersiz (opak sema ihlali)",
        ),
      );
    }

    this.registry.register({
      peerId: input.peerId,
      peerType: input.peerType,
      services,
    });
    this.tracker.markConnected(input.peerId);

    return Result.ok({
      peerId: input.peerId,
      peerType: input.peerType,
      services,
    });
  }
}

function isPeerType(value: string): value is TunnelPeerType {
  return (TUNNEL_PEER_TYPES as readonly string[]).includes(value);
}

/** `undefined` = duyuru yok; `undefined` dönüşü geçersiz = register reddi. */
function parseServices(raw: unknown): ServiceAnnouncement[] | undefined {
  if (raw === undefined) return [];
  if (!Array.isArray(raw)) return undefined;
  const services: ServiceAnnouncement[] = [];
  for (const item of raw) {
    const parsed = serviceAnnouncementSchema.safeParse(item);
    if (!parsed.success) return undefined;
    services.push(parsed.data);
  }
  return services;
}
