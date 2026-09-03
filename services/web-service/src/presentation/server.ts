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
import { LogRepository } from "../infrastructure/persistence/log-repository";
import { DeviceRegistry } from "../infrastructure/persistence/device-registry";
import { telemetryWsRoutes } from "../infrastructure/realtime/ws-routes";
import { containerWsRoutes } from "../infrastructure/container-proxy/container-ws-routes";
import { fieldRoutes } from "./routes/field-routes";
import { sessionOpenRoute, tunnelRoutes } from "./routes/session-routes";
import { adminRoutes } from "./routes/admin-routes";
import type { RealtimeManager } from "../infrastructure/realtime/realtime-manager";
import type { ContainerProxy } from "../infrastructure/container-proxy/container-proxy";
import type { FieldPoller } from "../infrastructure/field-poller";
import type { FieldConnector } from "@gd-monorepo/ws-tunnel";
import type { ContainerSessionStore } from "@gd-monorepo/ws-tunnel";
import type { ContainerSessionGateway } from "@gd-monorepo/ws-tunnel";
import type { TunnelProxy } from "@gd-monorepo/ws-tunnel";
import { containerSessionCookie } from "@gd-monorepo/ws-tunnel";
import { toWebUser } from "../infrastructure/container-session/session-user-map";
import { MaterializedViewManager, type IMessageQueue } from "@gd-monorepo/core";


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
  containerProxy?: ContainerProxy;
  fieldPoller?: FieldPoller;
  fieldConnector?: FieldConnector;
  sessionStore?: ContainerSessionStore;
  sessionGateway?: ContainerSessionGateway;
  tunnelProxy?: TunnelProxy;
  mvManager: MaterializedViewManager;
  mq: IMessageQueue;
  configDir: string;
  logger: TamperLogger;
  requestContext: RequestContext;
  /** Faz 6 T6.1 — MFA kaydı zorunlu roller (rbac enforcement). */
  mfaRequiredRoles: Role[];
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
    // Faz 3 (container tier): container_session cookie'si Bearer yerine geçer
    this.app.addHook(
      "onRequest",
      createRbacHook(
        deps.tokens,
        deps.sessionStore
          ? {
              sessionAuthenticator: async (cookie) => {
                const sessionUser = await deps.sessionStore!.authenticate(
                  containerSessionCookie(cookie) ?? "",
                );
                if (!sessionUser) return undefined;
                return toWebUser(sessionUser);
              },
            }
          : undefined,
        deps.mfaRequiredRoles,
      ),
    );
  }

  private async registerRoutes(deps: ServerDependencies): Promise<void> {
    this.app.get("/health", makeHealthRoute({ logger: deps.logger }));

    // T2.2: FieldConnector PPC durumu — container UI "Field Bağlantısı" beslemesi
    this.app.get(
      "/api/status",
      makeStatusRoute({ fieldConnector: deps.fieldConnector }),
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

    await this.app.register(
      async (fastify) => {
        await telemetryWsRoutes(fastify, {
          realtime: deps.realtime,
          tokens: deps.tokens,
          sessionStore: deps.sessionStore,
        });
      },
    );

    await this.app.register(
      async (fastify) => {
        await makeCommandRoutes(fastify, { mq: deps.mq, configDir: deps.configDir, logger: deps.logger });
      },
      { prefix: "/api/commands" },
    );

    await this.app.register(
      async (fastify) => {
        await fieldRoutes(fastify, { db: deps.postgres, containerProxy: deps.containerProxy });
        // Faz 3 T3.3: oturum açılışı (field tier)
        if (deps.sessionGateway) {
          await sessionOpenRoute(fastify, {
            gateway: deps.sessionGateway,
          });
        }
      },
      { prefix: "/api/fields" },
    );

    // Faz 3 T3.3: tünel proxy yolları (field tier — cookie doğrulamalı)
    if (deps.tunnelProxy) {
      await this.app.register(async (fastify) => {
        await tunnelRoutes(fastify, { tunnelProxy: deps.tunnelProxy! });
      });
    }

    const fieldPoller = deps.fieldPoller;
    if (fieldPoller) {
      await this.app.register(
        async (fastify) => {
          await adminRoutes(fastify, { fieldPoller });
        },
        { prefix: "/api/admin/fields" },
      );
    }

    const containerProxy = deps.containerProxy;
    if (containerProxy) {
      await this.app.register(
        async (fastify) => {
          await containerWsRoutes(fastify, { containerProxy });
        },
      );
    }
  }
}
