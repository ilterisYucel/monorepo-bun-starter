import Fastify, {
  type FastifyInstance,
  type FastifyServerOptions,
} from "fastify";
import { ZodError } from "zod";
import cors from "@fastify/cors";
import compress from "@fastify/compress";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import type { ServerConfig } from "../config/default";
import type { LoginUseCase } from "../application/use-cases/login-use-case";
import type { RefreshTokenUseCase } from "../application/use-cases/refresh-token-use-case";
import type { LogoutUseCase } from "../application/use-cases/logout-use-case";
import type { CreateUserUseCase } from "../application/use-cases/create-user-use-case";
import type { UpdateUserUseCase } from "../application/use-cases/update-user-use-case";
import type { DeleteUserUseCase } from "../application/use-cases/delete-user-use-case";
import type { ListUsersUseCase } from "../application/use-cases/list-users-use-case";
import type { IUserRepository } from "../domain/repositories/IUserRepository";
import type { ITokenService } from "../domain/services/ITokenService";
import { TimescaleDBAdapter } from "@gd-monorepo/core";
import type { ISqlDatabase } from "@gd-monorepo/core";
import { createRbacHook } from "./middleware/rbac";
import { makeAuthRoutes } from "./routes/auth-routes";
import { dataRoutes } from "./routes/data-routes";
import { unifiedRoutes } from "./routes/unified-routes";
import { deviceRoutes } from "./routes/device-routes";
import { logRoutes } from "./routes/log-routes";
import { LogRepository } from "../infrastructure/persistence/log-repository";
import { DeviceRegistry } from "../infrastructure/persistence/device-registry";

export interface ServerDependencies {
  serverConfig: ServerConfig;
  timescale: TimescaleDBAdapter;
  postgres: ISqlDatabase;
  tokens: ITokenService;
  userRepo: IUserRepository;
  loginUseCase: LoginUseCase;
  refreshTokenUseCase: RefreshTokenUseCase;
  logoutUseCase: LogoutUseCase;
  createUserUseCase: CreateUserUseCase;
  updateUserUseCase: UpdateUserUseCase;
  deleteUserUseCase: DeleteUserUseCase;
  listUsersUseCase: ListUsersUseCase;
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
      requestTimeout: 30000,
      keepAliveTimeout: 65000,
    };
    this.app = Fastify(options);

    this.app.setErrorHandler((error, _request, reply) => {
      if (error instanceof ZodError) {
        return reply.status(400).send({ error: error.flatten() });
      }
      console.error("[CRITICAL]", error);
      return reply.status(500).send({ error: "Internal server error" });
    });
  }

  async start(deps: ServerDependencies): Promise<void> {
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

    this.app.addHook("onRequest", createRbacHook(deps.tokens));
  }

  private async registerRoutes(deps: ServerDependencies): Promise<void> {
    this.app.get("/health", async (_request, reply) => {
      return reply.send({
        status: "ok",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      });
    });

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
        await unifiedRoutes(fastify, { registry, timescale: deps.timescale });
        await deviceRoutes(fastify, { postgres: deps.postgres });
      },
      { prefix: "/api/unified" },
    );

    await this.app.register(
      async (fastify) => {
        await logRoutes(fastify, { logRepo });
      },
      { prefix: "/api/logs" },
    );
  }
}
