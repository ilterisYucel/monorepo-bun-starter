import {
  HubPeerRegistry,
  HubSessionStore,
  SessionGateway,
  TunnelProxy,
} from "@gd-monorepo/ws-tunnel";
import type { FastifyInstance } from "fastify";
import http from "node:http";
import https from "node:https";
import type { ILogger } from "@gd-monorepo/ws-tunnel";
import type { SqlDatabase } from "./domain/ports/sql-database";
import { hostMapPorts, loadHubConfig } from "./config/hub-config";
import { loadTlsMaterial } from "./infrastructure/outbound/tls-material";
import type { TlsMaterial } from "./infrastructure/outbound/tls-material";
import type { HubConfig } from "./config/hub-config";
import { PeerConnectionTracker } from "./domain/peer-connection-tracker";
import { AuthenticatePeerToken } from "./application/authenticate-peer-token";
import { AuthenticateConsumerToken } from "./application/authenticate-consumer-token";
import { RegisterPeer } from "./application/register-peer";
import { DisconnectPeer } from "./application/disconnect-peer";
import { DiscoverPeers } from "./application/discover-peers";
import { OpenServiceAccess } from "./application/open-service-access";
import { RelayControl } from "./application/relay-control";
import { HealthCheck } from "./application/health-check";
import { CreateBootstrap } from "./application/create-bootstrap";
import { ClaimBootstrap } from "./application/claim-bootstrap";
import { RevokePeer } from "./application/revoke-peer";
import { OpenSession } from "./application/open-session";
import { PeerChannelHub } from "./infrastructure/inbound/peer-channel-hub";
import { ConsumerChannel } from "./infrastructure/inbound/consumer-channel";
import { buildHubServer } from "./infrastructure/inbound/fastify-server";
import { EnvPeerTokenStore } from "./infrastructure/outbound/env-peer-token-store";
import { SqlitePeerCredentialStore } from "./infrastructure/outbound/sqlite-peer-credential-store";
import { EnvConsumerCredentials } from "./infrastructure/outbound/env-consumer-credentials";
import { ConsoleLogger } from "./infrastructure/outbound/console-logger";
import { MemoryAuditSink } from "./infrastructure/outbound/memory-audit-sink";

/** Composition root çıktısı — testler ve main aynı wiring'i kullanır. */
export interface HubComposition {
  readonly server: FastifyInstance;
  readonly hub: PeerChannelHub;
  readonly gateway: SessionGateway;
  readonly tunnelProxy: TunnelProxy;
  readonly consumerChannel: ConsumerChannel;
  stop(): Promise<void>;
}

/**
 * Hub-servis kompozisyonu (hexagonal wiring).
 *
 * Auth modu: `env` → tek env token'ı; `sqlite` → bootstrap + kalıcı secret.
 * Tüm bağımlılıklar burada somut adapter'lara bağlanır; domain/application
 * katmanları framework görmez.
 */
export interface HubCompositionOptions {
  /** Logger adapter'ı (varsayılan ConsoleLogger). */
  readonly logger?: ILogger;
  /** sqlite modunda zorunlu DB factory (prod: bun:sqlite, test: node:sqlite). */
  readonly createDatabase?: (path: string) => SqlDatabase;
}

export async function createHub(
  config: HubConfig,
  options: HubCompositionOptions = {},
): Promise<HubComposition> {
  const logger = options.logger ?? new ConsoleLogger();
  const registry = new HubPeerRegistry();
  const tracker = new PeerConnectionTracker({
    staleTimeoutMs: config.staleTimeoutMs,
  });

  const database =
    config.authMode === "sqlite" ? openDatabase(config, options) : undefined;
  const sqliteStore =
    database !== undefined ? new SqlitePeerCredentialStore(database) : undefined;
  const credentials = sqliteStore ?? new EnvPeerTokenStore(requirePeerToken(config));

  const authenticatePeer = new AuthenticatePeerToken(credentials);
  const registerPeer = new RegisterPeer(registry, tracker, authenticatePeer);
  const disconnectPeer = new DisconnectPeer(registry, tracker);

  const consumerChannel = new ConsumerChannel();
  const hub = new PeerChannelHub({
    registry,
    tracker,
    registerPeer,
    disconnectPeer,
    consumerRelay: consumerChannel,
    onPeerRegistered: (peerId) => {
      // Peer yeniden bağlandı → o peer'ın bayat hub oturumunu kapat
      // (aksi halde eski token enjekte edilir; peer deposu sıfırlanmış olur).
      const existing = gateway.sessionForPeer(peerId);
      if (existing) gateway.closeSession(existing.sessionId, "peer-reconnect");
    },
    logger,
    sweepIntervalMs: config.sweepIntervalMs,
  });

  const sessions = new HubSessionStore({
    ttlMs: config.sessionTtlMs,
    idleTimeoutMs: config.sessionIdleTimeoutMs,
  });
  const audit = new MemoryAuditSink();
  const gateway = new SessionGateway(hub, sessions, audit, logger);
  const tunnelProxy = new TunnelProxy(hub, sessions, logger, {
    cookieName: config.cookieName,
    pathAllowlist: config.pathAllowlist,
    idleTimeoutMs: config.streamIdleTimeoutMs,
  });

  const discover = new DiscoverPeers(registry, tracker);
  const openAccess = new OpenServiceAccess(registry, tracker, gateway, {
    hubId: config.hubId,
    pathAllowlist: config.pathAllowlist,
  });
  const relay = new RelayControl(hub, registry, consumerChannel);
  const authenticateConsumer = new AuthenticateConsumerToken(
    new EnvConsumerCredentials(config.consumerToken),
  );
  const health = new HealthCheck(registry, tracker);

  const openSession = new OpenSession(registry, tracker, gateway, {
    hubId: config.hubId,
  });

  const bootstrap =
    sqliteStore !== undefined
      ? {
          create: new CreateBootstrap(sqliteStore),
          claim: new ClaimBootstrap(sqliteStore),
          revoke: new RevokePeer(sqliteStore, hub),
        }
      : undefined;

  const server = await buildHubServer({
    hub,
    consumerChannel,
    tunnelProxy,
    discover,
    openAccess,
    relay,
    authenticateConsumer,
    health,
    openSession,
    bootstrap,
    peerSessionCookie: config.peerSessionCookie,
    cookieName: config.cookieName,
    hostMap: config.hostMap,
  });

  hub.start();
  gateway.initialize();
  tunnelProxy.initialize();

  return {
    server,
    hub,
    gateway,
    tunnelProxy,
    consumerChannel,
    async stop() {
      // Önce soketleri kapat (server.close açık bağlantı bekler), sonra dinleyici.
      hub.stop();
      gateway.stop();
      tunnelProxy.stop();
      consumerChannel.closeAll();
      await server.close();
      database?.close();
    },
  };
}

function requirePeerToken(config: HubConfig): string {
  if (config.peerToken === undefined) {
    throw new Error("[createHub] env auth modu icin peerToken zorunlu");
  }
  return config.peerToken;
}

function openDatabase(
  config: HubConfig,
  options: HubCompositionOptions,
): SqlDatabase {
  if (config.dbPath === undefined) {
    throw new Error("[createHub] sqlite auth modu icin dbPath zorunlu");
  }
  if (options.createDatabase === undefined) {
    throw new Error("[createHub] sqlite auth modu icin createDatabase gerekli");
  }
  return options.createDatabase(config.dbPath);
}

/**
 * Ek portları aynı Fastify örneğine bağlar (A2 kök-montaj: port→host eşlemesi).
 * TLS materyali verilirse https (tarayıcı kenarı), yoksa http dinler.
 */
export function attachExtraPorts(
  server: FastifyInstance,
  ports: number[],
  tls?: TlsMaterial,
): (http.Server | https.Server)[] {
  return ports.map((port) => {
    const forward = (request: http.IncomingMessage, response: http.ServerResponse) => {
      void (async () => {
        try {
          await server.ready();
          server.server.emit("request", request, response);
        } catch {
          response.statusCode = 503;
          response.end();
        }
      })();
    };
    const listener =
      tls !== undefined
        ? https.createServer({ cert: tls.cert, key: tls.key }, forward)
        : http.createServer(forward);
    listener.on("upgrade", (request, socket, head) => {
      void (async () => {
        try {
          await server.ready();
          // ELEGANT-EXCEPTION: front soketinde `_httpMessage` set'li gelir;
          // Fastify/@fastify/websocket `assignSocket` bunu reddeder. Node iç
          // alanı sıfırlanır (çok-portlu fastify + upgrade standart deseni).
          (socket as unknown as { _httpMessage: unknown })._httpMessage = null;
          server.server.emit("upgrade", request, socket, head);
        } catch {
          socket.destroy();
        }
      })();
    });
    listener.listen(port);
    return listener;
  });
}

async function main(): Promise<void> {
  const config = loadHubConfig();
  // Dinamik import: `bun:sqlite` yalnız CLI/üretim yolunda yüklenir (testler Node).
  const { BunSqliteDatabase } = await import(
    "./infrastructure/outbound/bun-sqlite-database"
  );
  const composition = await createHub(config, {
    createDatabase: (path) => new BunSqliteDatabase(path),
  });
  await composition.server.listen({ host: config.host, port: config.port });
  const extraPorts = hostMapPorts(config.hostMap ?? new Map());
  const tlsMaterial = loadTlsMaterial(config.tls);
  const extraServers = attachExtraPorts(composition.server, extraPorts, tlsMaterial);
  console.log(
    `[HubServis] dinleniyor ${config.host}:${config.port} (auth=${config.authMode}, cookie=${config.cookieName})`,
  );
  if (extraPorts.length > 0) {
    console.log(
      `[HubServis] ek portlar: ${extraPorts.join(", ")} (${tlsMaterial !== undefined ? "https" : "http"})`,
    );
  }

  const shutdown = async (signal: string): Promise<void> => {
    console.log(`[HubServis] ${signal} — kapatiliyor`);
    await Promise.all(
      extraServers.map(
        (server) =>
          new Promise<void>((resolve) => server.close(() => resolve())),
      ),
    );
    await composition.stop();
    process.exit(0);
  };
  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

if (import.meta.main) {
  void main().catch((error: unknown) => {
    console.error("[HubServis] acilis hatasi:", error);
    process.exit(1);
  });
}
