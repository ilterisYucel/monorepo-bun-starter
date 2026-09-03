// packages/core/src/messaging/redis.ts

import { createClient, type RedisClientType } from "redis";

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
}

export class RedisConnection {
  private readonly redisClient: RedisClientType;
  private readonly config: RedisConfig;
  private isConnected: boolean = false;

  constructor(config: RedisConfig) {
    this.config = config;
    const credentials = config.password ? `:${config.password}@` : "";
    const url = `redis://${credentials}${config.host}:${config.port}`;
    this.redisClient = createClient({ url, database: config.db ?? 0 });

    this.redisClient.on("error", (err) => {
      console.error("[Redis] Connection error:", err);
    });
  }

  async connect(): Promise<void> {
    if (!this.isConnected) {
      await this.redisClient.connect();
      this.isConnected = true;
      console.log("[Redis] Connected");
    }
  }

  async disconnect(): Promise<void> {
    if (this.isConnected) {
      await this.redisClient.quit();
      this.isConnected = false;
      console.log("[Redis] Disconnected");
    }
  }

  client(): RedisClientType {
    return this.redisClient;
  }

  connectionConfig(): {
    host: string;
    port: number;
    password?: string;
    db?: number;
  } {
    return {
      host: this.config.host,
      port: this.config.port,
      password: this.config.password,
      db: this.config.db,
    };
  }

  isReady(): boolean {
    return this.isConnected && this.redisClient.isReady;
  }

  async ping(): Promise<boolean> {
    try {
      const pong = await this.redisClient.ping();
      return pong === "PONG";
    } catch {
      return false;
    }
  }
}
