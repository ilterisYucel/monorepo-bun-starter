// packages/core/src/messaging/redis.ts

import { createClient, type RedisClientType } from "redis";

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
}

export class RedisConnection {
  private client: RedisClientType;
  private config: RedisConfig;
  private isConnected: boolean = false;

  constructor(config: RedisConfig) {
    this.config = config;
    const url = `redis://${config.password ? `:${config.password}@` : ""}${config.host}:${config.port}`;
    this.client = createClient({ url, database: config.db ?? 0 });

    this.client.on("error", (err) => {
      console.error("[Redis] Connection error:", err);
    });
  }

  async connect(): Promise<void> {
    if (!this.isConnected) {
      await this.client.connect();
      this.isConnected = true;
      console.log("[Redis] Connected");
    }
  }

  async disconnect(): Promise<void> {
    if (this.isConnected) {
      await this.client.quit();
      this.isConnected = false;
      console.log("[Redis] Disconnected");
    }
  }

  getClient(): RedisClientType {
    return this.client;
  }

  getConnectionConfig(): {
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
    return this.isConnected && this.client.isReady;
  }

  async ping(): Promise<boolean> {
    try {
      const pong = await this.client.ping();
      return pong === "PONG";
    } catch {
      return false;
    }
  }
}
