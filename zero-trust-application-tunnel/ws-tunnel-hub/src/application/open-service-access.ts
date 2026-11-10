import {
  Result,
  ForbiddenError,
  NotFoundError,
  TransientError,
  isPathAllowed,
} from "@gd-monorepo/ws-tunnel";
import type {
  DomainError,
  HubPeerRegistry,
  HubSession,
  PathAllowlist,
  SessionGateway,
  TunnelUser,
} from "@gd-monorepo/ws-tunnel";
import type { PeerConnectionTracker } from "../domain/peer-connection-tracker";

/** Erişim yapılandırması (hexagonal — env'den adapter besler). */
export interface OpenServiceAccessConfig {
  /** Audit korelasyonu için hub site kimliği (verilmezse peerId). */
  hubId?: string;
  /** Path allowlist/blocklist — tüketici config'i. */
  pathAllowlist?: PathAllowlist;
}

/** Erişim isteği — inbound adapter prefix'i strip edip verir. */
export interface AccessRequest {
  readonly peerId: string;
  readonly serviceId: string;
  readonly path: string;
  /** Cookie ile çözülmüş hazır oturum (tarayıcı yolu). */
  readonly session?: HubSession;
  /** Oturum yoksa kullanıcı (consumer/programatik yol). */
  readonly user?: TunnelUser;
  readonly remoteIp?: string;
  /**
   * A2 kök-montaj: admin'in açık yayın kararı → allowlist atlanır, yalnız
   * blocklist uygulanır (mount'un kendisi yetki sınırıdır).
   */
  readonly rootMount?: boolean;
}

/** Yetkilendirilmiş erişim — adapter stream/bridge başlatır. */
export interface AccessGrant {
  readonly session: HubSession;
  readonly path: string;
}

/**
 * OpenServiceAccess — opak erişim use-case'i.
 *
 * Doğrular (servis duyurulmuş mu, peer bağlı mı, allowlist) ve oturumu
 * açar/yeniden kullanır. `IStreamSink`/WS soketi adapter'da kalır — framework
 * bu katmana girmez.
 */
export class OpenServiceAccess {
  constructor(
    private readonly registry: HubPeerRegistry,
    private readonly tracker: PeerConnectionTracker,
    private readonly gateway: SessionGateway,
    private readonly config: OpenServiceAccessConfig = {},
  ) {}

  async authorize(
    request: AccessRequest,
  ): Promise<Result<AccessGrant, DomainError>> {
    const announced = this.registry
      .servicesOf(request.peerId)
      .some((service) => service.id === request.serviceId);
    if (!announced) {
      return Result.err(
        new NotFoundError(
          "hub.access.service-not-found",
          "Servis duyurulmamis",
        ),
      );
    }
    if (!this.tracker.isConnected(request.peerId)) {
      return Result.err(
        new TransientError("hub.access.peer-offline", "Peer bagli degil"),
      );
    }
    if (!this.pathAllowed(request.path, request.rootMount === true)) {
      return Result.err(
        new ForbiddenError("hub.access.path-denied", "Yol tunelden kapali"),
      );
    }

    if (request.session !== undefined) {
      return Result.ok({ session: request.session, path: request.path });
    }
    if (request.user === undefined) {
      return Result.err(
        new ForbiddenError("hub.access.no-user", "Kullanici veya oturum gerekli"),
      );
    }

    const existing = this.gateway.sessionForPeer(request.peerId);
    if (existing) {
      return Result.ok({ session: existing, path: request.path });
    }

    const opened = await this.gateway.openSession({
      hubId: this.config.hubId ?? request.peerId,
      peerId: request.peerId,
      user: request.user,
      remoteIp: request.remoteIp,
    });
    if (opened.isErr()) {
      return Result.err(opened.error());
    }
    const session = this.gateway.sessionForPeer(request.peerId);
    if (!session) {
      return Result.err(
        new TransientError(
          "hub.access.session-missing",
          "Oturum kurulamadi",
        ),
      );
    }
    return Result.ok({ session, path: request.path });
  }

  /**
   * Kök-montajda allowlist atlanır (mount = yetki); blocklist her modda kazanır.
   */
  private pathAllowed(path: string, rootMount: boolean): boolean {
    if (!rootMount) return isPathAllowed(path, this.config.pathAllowlist);
    const clean = path.split("?")[0] ?? path;
    const blocked = this.config.pathAllowlist?.blockedPrefixes ?? [];
    return !blocked.some(
      (prefix) => clean === prefix || clean.startsWith(prefix),
    );
  }
}
