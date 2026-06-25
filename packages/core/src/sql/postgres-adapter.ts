// packages/core/src/sql/postgres-adapter.ts

import { Pool } from "pg";
import type { PoolClient } from "pg";
import type { ISqlDatabase } from "./interface";
import type { PostgresConfig } from "@gd-monorepo/shared-types";

export type { PostgresConfig };

export class PostgresAdapter implements ISqlDatabase {
  private pool: Pool | undefined;

  constructor(private readonly config: PostgresConfig) {}

  async connect(): Promise<void> {
    this.pool = new Pool({
      host: this.config.host,
      port: this.config.port,
      user: this.config.user,
      password: this.config.password,
      database: this.config.database,
      ssl: this.config.ssl,
      max: this.config.maxConnections ?? 10,
    });

    const client = await this.pool.connect();
    client.release();
    console.log("[PostgresAdapter] Baglandi");
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = undefined;
      console.log("[PostgresAdapter] Baglanti kesildi");
    }
  }

  async execute(sql: string, params?: unknown[]): Promise<void> {
    const client = await this.client();
    try {
      await client.query(sql, params);
    } finally {
      client.release();
    }
  }

  async query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]> {
    const client = await this.client();
    try {
      const result = await client.query(sql, params);
      return result.rows as T[];
    } finally {
      client.release();
    }
  }

  async queryOne<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T | undefined> {
    const client = await this.client();
    try {
      const result = await client.query(sql, params);
      return result.rows[0] as T | undefined;
    } finally {
      client.release();
    }
  }

  async health(): Promise<boolean> {
    if (!this.pool) return false;
    try {
      const client = await this.pool.connect();
      client.release();
      return true;
    } catch {
      return false;
    }
  }

  private async client(): Promise<PoolClient> {
    if (!this.pool) throw new Error("[PostgresAdapter] Havuz baslatilmamis");
    return this.pool.connect();
  }
}
