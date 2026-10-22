import Fastify from "fastify";
import type { FastifyInstance } from "fastify";
import websocket from "@fastify/websocket";
import type { TunnelProxy } from "@gd-monorepo/ws-tunnel";
import type { HealthCheck } from "../../application/health-check";
import type { DiscoverPeers } from "../../application/discover-peers";
import type { OpenServiceAccess } from "../../application/open-service-access";
import type { RelayControl } from "../../application/relay-control";
import type { AuthenticateConsumerToken } from "../../application/authenticate-consumer-token";
import type { CreateBootstrap } from "../../application/create-bootstrap";
import type { ClaimBootstrap } from "../../application/claim-bootstrap";
import type { RevokePeer } from "../../application/revoke-peer";
import type { OpenSession } from "../../application/open-session";
import type { HostMount } from "../../config/hub-config";
import type { PeerChannelHub } from "./peer-channel-hub";
import type { ConsumerChannel } from "./consumer-channel";
import { peerWsRoutes } from "./peer-routes";
import { discoveryRoutes } from "./routes/discovery-routes";
import { accessRoutes } from "./routes/access-routes";
import { controlRoutes } from "./routes/control-routes";
import { healthRoutes } from "./routes/health-routes";
import { adminRoutes } from "./routes/admin-routes";
import { bootstrapRoutes } from "./routes/bootstrap-routes";
import { sessionRoutes } from "./routes/session-routes";

export interface HubServerDeps {
  readonly hub: PeerChannelHub;
  readonly consumerChannel: ConsumerChannel;
  readonly tunnelProxy: TunnelProxy;
  readonly discover: DiscoverPeers;
  readonly openAccess: OpenServiceAccess;
  readonly relay: RelayControl;
  readonly authenticateConsumer: AuthenticateConsumerToken;
  readonly health: HealthCheck;
  /** Peer uygulamasının beklediği oturum cookie adı. */
  readonly peerSessionCookie?: string;
  /** Tarayıcı oturum cookie'si — bayat cookie tespiti/temizliği için. */
  readonly cookieName: string;
  /** Host header → (peer, servis) kök-montaj haritası (A2). */
  readonly hostMap?: ReadonlyMap<string, HostMount>;
  /** Tarayıcı/consumer oturum açma use-case'i. */
  readonly openSession?: OpenSession;
  /** Sqlite modunda bootstrap/revoke use-case'leri; env modunda undefined. */
  readonly bootstrap?: {
    readonly create: CreateBootstrap;
    readonly claim: ClaimBootstrap;
    readonly revoke: RevokePeer;
  };
}

/** Fastify inbound adapter'ını kurar (framework YALNIZ burada). */
export async function buildHubServer(
  deps: HubServerDeps,
): Promise<FastifyInstance> {
  const app = Fastify({ logger: false, forceCloseConnections: true });
  await app.register(websocket);

  peerWsRoutes(app, { hub: deps.hub });
  discoveryRoutes(app, { discover: deps.discover });
  accessRoutes(app, {
    openAccess: deps.openAccess,
    tunnelProxy: deps.tunnelProxy,
    authenticateConsumer: deps.authenticateConsumer,
    peerSessionCookie: deps.peerSessionCookie,
    cookieName: deps.cookieName,
    hostMap: deps.hostMap,
  });
  controlRoutes(app, {
    relay: deps.relay,
    consumerChannel: deps.consumerChannel,
    authenticateConsumer: deps.authenticateConsumer,
  });
  healthRoutes(app, { health: deps.health });

  if (deps.openSession !== undefined) {
    sessionRoutes(app, {
      openSession: deps.openSession,
      authenticateConsumer: deps.authenticateConsumer,
    });
  }

  if (deps.bootstrap !== undefined) {
    adminRoutes(app, {
      createBootstrap: deps.bootstrap.create,
      revokePeer: deps.bootstrap.revoke,
      authenticateConsumer: deps.authenticateConsumer,
    });
    bootstrapRoutes(app, { claimBootstrap: deps.bootstrap.claim });
  }

  return app;
}
