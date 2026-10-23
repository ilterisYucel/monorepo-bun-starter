import Fastify, {
  type FastifyInstance,
  type FastifyServerOptions,
} from "fastify";
import cors from "@fastify/cors";
import compress from "@fastify/compress";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import websocket from "@fastify/websocket";
import type { ServerConfig } from "../config/default";
import type { Role } from "@gd-monorepo/shared-types";

import type { LoginUseCase } from "../application/use-cases/login-use-case";
import type { RefreshTokenUseCase } from "../application/use-cases/refresh-token-use-case";
import type { LogoutUseCase } from "../application/use-cases/logout-use-case";
import type { ChangePasswordUseCase } from "../application/use-cases/change-password-use-case";
import type { MfaLoginUseCase } from "../application/use-cases/mfa-login-use-case";
import type { MfaEnrollUseCase } from "../application/use-cases/mfa-enroll-use-case";
import type { CreateUserUseCase } from "../application/use-cases/create-user-use-case";
import type { UpdateUserUseCase } from "../application/use-cases/update-user-use-case";
import type { DeleteUserUseCase } from "../application/use-cases/delete-user-use-case";
import type { ListUsersUseCase } from "../application/use-cases/list-users-use-case";
import type { IUserRepository } from "../domain/repositories/IUserRepository";
import type { ITokenService } from "../domain/services/ITokenService";
import type { ITimeseriesDatabase } from "@gd-monorepo/core";

import type { ISqlDatabase } from "@gd-monorepo/core";
import { TamperLogger } from "@gd-monorepo/tamper-logger";

import { createRbacHook } from "./middleware/rbac";
import { createRequestIdHook, RequestContext } from "./middleware/request-context";
import { createErrorHandler } from "./middleware/error-handler";
import { LogRateLimiter } from "./middleware/log-rate-limiter";
import { makeAuthRoutes } from "./routes/auth-routes";
import { dataRoutes } from "./routes/data-routes";
import { unifiedRoutes } from "./routes/unified-routes";
import { deviceRoutes } from "./routes/device-routes";
import { logRoutes } from "./routes/log-routes";
import { makeHealthRoute } from "./routes/health-route";
import { makeStatusRoute } from "./routes/status-route";
import { alarmRoutes } from "./routes/alarm-routes";
import { makeCommandRoutes } from "./routes/command-routes";
import { maneuverOperationRoutes } from "./routes/maneuver-routes";
import { operationBossRoutes } from "./routes/operation-boss-routes";
import { eventRoutes } from "./routes/event-routes";
import { LogRepository } from "../infrastructure/persistence/log-repository";
import { DeviceRegistry } from "../infrastructure/persistence/device-registry";
import { CommandWriteStore } from "../infrastructure/persistence/command-write-store";
import type { OperationRunStore } from "../infrastructure/persistence/operation-run-store";
import type { OperationDefStore } from "../infrastructure/persistence/operation-def-store";
import type { OperationRequester } from "../infrastructure/field-uplink/operation-requester";
import type { ManeuverRegistry, OperationExecutor } from "@gd-monorepo/platform-commands";
import { telemetryWsRoutes } from "../infrastructure/realtime/ws-routes";
import { fieldRoutes } from "./routes/field-routes";
import { topologyRoutes } from "./routes/topology-routes";
import { fieldContainerCommandRoutes } from "./routes/field-container-commands";
import { hubSessionRoutes } from "./routes/hub-session-routes";
import { notificationRoutes } from "./routes/notification-routes";
import type { FieldEventCollector } from "../infrastructure/field-uplink/field-event-collector";
import type { RealtimeManager } from "../infrastructure/realtime/realtime-manager";
import type { IContainerProxy } from "@gd-monorepo/platform-container-access";
import type { HubConsumerClient } from "../infrastructure/hub-consumer";
import { MaterializedViewManager, type IMessageQueue } from "@gd-monorepo/core";
import type { ISessionAuthenticator } from "../infrastructure/container-session/stateless-session-authenticator";


export interface ServerDependencies {
  serverConfig: ServerConfig;
  timescale: ITimeseriesDatabase;
  postgres: ISqlDatabase;
  tokens: ITokenService;
  userRepo: IUserRepository;
  loginUseCase: LoginUseCase;
  refreshTokenUseCase: RefreshTokenUseCase;
  logoutUseCase: LogoutUseCase;
  changePasswordUseCase: ChangePasswordUseCase;
  createUserUseCase: CreateUserUseCase;
  updateUserUseCase: UpdateUserUseCase;
  deleteUserUseCase: DeleteUserUseCase;
  listUsersUseCase: ListUsersUseCase;
  mfaLoginUseCase?: MfaLoginUseCase;
  mfaEnrollUseCase?: MfaEnrollUseCase;
  realtime: RealtimeManager;
  containerProxy?: IContainerProxy;
  fieldEventCollector?: FieldEventCollector;
  /** Container tier: agent imzalı `container_session` doğrulayıcısı. */
  containerSessionAuthenticator?: ISessionAuthenticator;
  /** Boss tier: field app tünel allowlist'i (deployment config). */
  mvManager: MaterializedViewManager;
  mq: IMessageQueue;
  configDir: string;
  logger: TamperLogger;
  requestContext: RequestContext;
  /** Faz 6 T6.1 — MFA kaydı zorunlu roller (rbac enforcement). */
  mfaRequiredRoles: Role[];
  /** P3: hub-servis consumer client (HUB_MODE=hub). */
  hubConsumerClient?: HubConsumerClient;
  /** P3: hub servis kimliği (oturum redirect'i için). */
  hubConsumerServiceId?: string;
  /** KOMUT-MANEVRA-OPERASYON Faz B/C — awilix'te kurulan paylaşımlı bileşenler. */
  maneuverRegistry?: ManeuverRegistry;
  maneuverExecutor?: OperationExecutor;
  operationRunStore?: OperationRunStore;
  operationDefStore?: OperationDefStore;
  operationRequester?: OperationRequester;
  /** Field tier: saha kimliği — olay ucu (`GET /api/events`) eventId öneki. */
  siteFieldId?: string;
}

export class WebServiceServer {
  private readonly app: FastifyInstance;
  private readonly config: ServerConfig;

  constructor(config: ServerConfig) {
    this.config = config;
    const options: FastifyServerOptions = {
      logger: false,
      bodyLimit: 1048576,
      trustProxy: true,
      requestTimeout: 60000,
      keepAliveTimeout: 65000,
    };
    this.app = Fastify(options);
  }

  async start(deps: ServerDependencies): Promise<void> {
    // Tek sınır log noktası (T0.6) — route'lardan önce kaydedilir.
    this.app.setErrorHandler(
      createErrorHandler({
        logger: deps.logger,
        context: deps.requestContext,
      }),
    );

    await this.registerPlugins(deps);
    await this.registerRoutes(deps);

    await this.app.listen({
      port: this.config.port,
      host: this.config.host,
    });

    console.log(
      `[WebServiceServer] ${this.config.host}:${this.config.port} adresinde dinleniyor`,
    );
  }

  async stop(): Promise<void> {
    await this.app.close();
    console.log("[WebServiceServer] Durduruldu");
  }

  getApp(): FastifyInstance {
    return this.app;
  }

  private async registerPlugins(deps: ServerDependencies): Promise<void> {
    await this.app.register(cors, { origin: true, credentials: true });
    await this.app.register(compress, { global: true, threshold: 1024 });
    await this.app.register(swagger, {
      openapi: {
        info: {
          title: "Web Service API",
          description: "Auth + Veri API",
          version: "1.0.0",
        },
        servers: [
          { url: `http://${this.config.host}:${this.config.port}` },
        ],
        components: {
          securitySchemes: {
            bearerAuth: { type: "http", scheme: "bearer" },
          },
        },
      },
    });
    await this.app.register(swaggerUi, { routePrefix: "/docs" });
    // ELEGANT-EXCEPTION: ws 8.17+ sunucu tarafinda pingInterval destekler;
    // @types/ws bu alani henuz bilmedigi icin plugin options tipine cast edilir.
    await this.app.register(websocket, {
      options: {
        pingInterval: 30000,
        pingTimeout: 10000,
      },
    } as unknown as Parameters<typeof websocket>[1]);

    // correlationId bağlamı rbac'ten ÖNCE kurulur — tüm kancalar aynı id'yi görür.
    this.app.addHook("onRequest", createRequestIdHook(deps.requestContext));
    // Container tier: agent imzalı `container_session` cookie'si Bearer yerine geçer
    // (stateless doğrulama — SPEC KONTEYNER-AGENT-KAYIT).
    const sessionRbacOptions = deps.containerSessionAuthenticator
      ? {
          sessionAuthenticator: (cookie: string | undefined) =>
            deps.containerSessionAuthenticator!.authenticate(cookie),
        }
      : undefined;
    this.app.addHook(
      "onRequest",
      createRbacHook(deps.tokens, sessionRbacOptions, deps.mfaRequiredRoles),
    );
  }

  private async registerRoutes(deps: ServerDependencies): Promise<void> {
    this.app.get("/health", makeHealthRoute({ logger: deps.logger }));

    // T2.2: TunnelConnector PPC durumu — container UI "Field Bağlantısı" beslemesi
    this.app.get(
      "/api/status",
      makeStatusRoute(),
    );

    await this.app.register(
      async (fastify) => {
        await makeAuthRoutes(fastify, deps);
      },
      { prefix: "/api/auth" },
    );

    await this.app.register(
      async (fastify) => {
        await dataRoutes(fastify, { timescale: deps.timescale });
      },
      { prefix: "/api/data" },
    );

    const registry = new DeviceRegistry(deps.postgres);
    const logRepo = new LogRepository(deps.postgres);
    await logRepo.initialize();

    await this.app.register(
      async (fastify) => {
        await unifiedRoutes(fastify, {
          registry,
          timescale: deps.timescale,
          mvManager: deps.mvManager,
          postgres: deps.postgres,
        });
        await deviceRoutes(fastify, { postgres: deps.postgres });
        await alarmRoutes(fastify, {
          postgres: deps.postgres,
          logger: deps.logger,
        });
      },
      { prefix: "/api/unified" },
    );

    await this.app.register(
      async (fastify) => {
        await logRoutes(fastify, {
          logRepo,
          rateLimiter: new LogRateLimiter(),
        });
      },
      { prefix: "/api/logs" },
    );

    // KOMUT-MANEVRA-OPERASYON §4 — manevra/operasyon yürütme + kayıt rotaları.
    // Bileşenler awilix container'da kurulur (server ile index arasında
    // paylaşılır — responder/executor aynı örnektir); DDL'ler burada açılır.
    if (deps.operationDefStore) {
      await deps.operationDefStore.initialize();
    }
    if (deps.operationRunStore) {
      await deps.operationRunStore.initialize();
    }

    if (deps.maneuverRegistry && deps.maneuverExecutor && deps.operationRunStore) {
      await this.app.register(
        async (fastify) => {
          await maneuverOperationRoutes(fastify, {
            registry: deps.maneuverRegistry,
            executor: deps.maneuverExecutor,
            runStore: deps.operationRunStore,
            ...(deps.operationDefStore
              ? { defs: deps.operationDefStore }
              : {}),
            logger: deps.logger,
            internalToken: process.env.FIELD_INTERNAL_API_TOKEN,
          });
        },
        { prefix: "/api" },
      );
    }

    // Field tier: boss olay toplama ucu (SPEC UC-5 — HTTP pull).
    if (deps.siteFieldId) {
      await this.app.register(
        async (fastify) => {
          await eventRoutes(fastify, {
            sql: deps.postgres,
            fieldId: deps.siteFieldId!,
            internalToken: process.env.FIELD_INTERNAL_API_TOKEN,
          });
        },
        { prefix: "/api" },
      );
    }

    // Boss tier: field'da operasyon tetikleme (SPEC UC-4 — HTTP relay).
    await this.app.register(
      async (fastify) => {
        await operationBossRoutes(fastify, {
          ...(deps.operationRequester
            ? { requester: deps.operationRequester }
            : {}),
          internalToken: process.env.FIELD_INTERNAL_API_TOKEN,
        });
      },
      { prefix: "/api" },
    );

    await this.app.register(
      async (fastify) => {
        await telemetryWsRoutes(fastify, {
          realtime: deps.realtime,
          tokens: deps.tokens,
          sessionAuthenticator: deps.containerSessionAuthenticator,
        });
      },
    );

    await this.app.register(
      async (fastify) => {
        const writes = new CommandWriteStore(deps.postgres);
        await writes.initialize();
        await makeCommandRoutes(fastify, {
          mq: deps.mq,
          configDir: deps.configDir,
          logger: deps.logger,
          writes,
        });
      },
      { prefix: "/api/commands" },
    );

    await this.app.register(
      async (fastify) => {
        await fieldRoutes(fastify, { db: deps.postgres, containerProxy: deps.containerProxy });
        await topologyRoutes(fastify);
        // WS4 D3: field → konteyner komut proxy'si — hub-servis REST (consumer).
        if (deps.hubConsumerClient && deps.hubConsumerServiceId) {
          await fieldContainerCommandRoutes(fastify, {
            hubAccess: {
              client: deps.hubConsumerClient,
              serviceId: deps.hubConsumerServiceId,
            },
            logger: deps.logger,
            // Programatik kanal (management-service) gizli token'ı —
            // env yoksa internal yol KAPALI (fail-closed).
            internalToken: process.env.FIELD_INTERNAL_API_TOKEN,
          });
        }
      },
      { prefix: "/api/fields" },
    );

    // P3: kullanıcı adına hub-servis oturumu (cookie front-door).
    if (deps.hubConsumerClient && deps.hubConsumerServiceId) {
      await this.app.register(
        async (fastify) => {
          await hubSessionRoutes(fastify, {
            client: deps.hubConsumerClient!,
            cookieName: "tunnel_session",
            serviceId: deps.hubConsumerServiceId!,
          });
        },
        { prefix: "/api/hub" },
      );
    }

    // Boss tier: bildirim akışı (Faz 5 — alarm/audit aktarımı)
    if (deps.fieldEventCollector) {
      await this.app.register(
        async (fastify) => {
          await notificationRoutes(fastify, {
            collector: deps.fieldEventCollector!,
          });
        },
        { prefix: "/api/notifications" },
      );
    }

    const containerProxy = deps.containerProxy;
    if (containerProxy) {
      await this.app.register(
        async (fastify) => {
  
        },
      );
    }
  }
}
