import Fastify, {
  type FastifyInstance,
  type FastifyServerOptions,
} from "fastify";
import cors from "@fastify/cors";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import websocket from "@fastify/websocket";
import compress from "@fastify/compress"; // 🔥 EKLE

export interface ServerConfig {
  port: number;
  host: string;
  http2?: boolean;
  https?: {
    key: string;
    cert: string;
  };
}

export class FastifyServer {
  private app: FastifyInstance;
  private config: ServerConfig;

  constructor(config: ServerConfig) {
    this.config = config;

    const options: FastifyServerOptions = {
      logger: false,
      bodyLimit: 1048576, // 1MB
      trustProxy: true,
    };

    this.app = Fastify(options);
  }

  async start(): Promise<void> {
    await this.registerPlugins();
    await this.registerRoutes();

    try {
      await this.app.listen({
        port: this.config.port,
        host: this.config.host,
      });
      console.log(
        `[FastifyServer] Listening on ${this.config.host}:${this.config.port}`,
      );
      if (this.config.http2) {
        console.log(`[FastifyServer] HTTP/2 enabled`);
      }
    } catch (error) {
      console.error("[FastifyServer] Failed to start:", error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    await this.app.close();
    console.log("[FastifyServer] Stopped");
  }

  getApp(): FastifyInstance {
    return this.app;
  }

  private async registerPlugins(): Promise<void> {
    // CORS
    await this.app.register(cors, {
      origin: true,
      credentials: true,
    });

    await this.app.register(compress, {
      global: true,
      threshold: 1024, // 1KB üzerindeki yanıtları sıkıştır
    });

    // Swagger/OpenAPI
    await this.app.register(swagger, {
      openapi: {
        info: {
          title: "Battery Rack Controller API",
          description: "Demo Backend API for battery rack monitoring",
          version: "1.0.0",
        },
        servers: [{ url: `http://${this.config.host}:${this.config.port}` }],
        components: {
          securitySchemes: {
            bearerAuth: {
              type: "http",
              scheme: "bearer",
            },
          },
        },
      },
    });

    await this.app.register(swaggerUi, {
      routePrefix: "/docs",
    });

    // WebSocket desteği
    await this.app.register(websocket);
  }

  private async registerRoutes(): Promise<void> {
    // Health check
    this.app.get("/health", async (_request, reply) => {
      return reply.status(200).send({
        status: "ok",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      });
    });
  }
}
