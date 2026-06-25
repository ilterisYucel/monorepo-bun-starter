import {
  RedisConnection,
  BullMQAdapter,
  TimescaleDBAdapter,
  PostgresAdapter,
} from "@gd-monorepo/core";
import { validateOrThrow, redisConfigSchema, postgresConfigSchema } from "@gd-monorepo/shared-types";
import type { PostgresConfig } from "@gd-monorepo/shared-types";
import type { RedisConfig } from "@gd-monorepo/core";
import { DataService } from "./src/data-service";

function redisConfig(): RedisConfig {
  return validateOrThrow<RedisConfig>(redisConfigSchema, {
    host: process.env.REDIS_HOST ?? "127.0.0.1",
    port: parseInt(process.env.REDIS_PORT ?? "6379", 10),
    password: process.env.REDIS_PASSWORD,
    db: process.env.REDIS_DB ? parseInt(process.env.REDIS_DB, 10) : undefined,
  }, "redisConfig");
}

function postgresConfig(): PostgresConfig {
  return validateOrThrow<PostgresConfig>(postgresConfigSchema, {
    host: process.env.TIMESCALE_HOST ?? "127.0.0.1",
    port: parseInt(process.env.TIMESCALE_PORT ?? "5432", 10),
    user: process.env.TIMESCALE_USER ?? "postgres",
    password: process.env.TIMESCALE_PASSWORD ?? "password",
    database: process.env.TIMESCALE_DATABASE ?? "battery",
    maxConnections: parseInt(process.env.TIMESCALE_POOL_SIZE ?? "20", 10),
  }, "postgresConfig");
}

async function main() {
  console.log("[run] Data Service baslatiliyor...");

  const redis = new RedisConnection(redisConfig());
  const mq = new BullMQAdapter(redis);

  const pgConfig = postgresConfig();
  const timescale = new TimescaleDBAdapter(pgConfig);

  const postgres = new PostgresAdapter(pgConfig);
  await postgres.connect();

  await postgres.execute(`
    CREATE TABLE IF NOT EXISTS system_logs (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      timestamp   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      type        VARCHAR(20) NOT NULL CHECK (type IN ('info', 'success', 'error', 'warning')),
      source      VARCHAR(20) NOT NULL CHECK (source IN ('system', 'user')),
      message     TEXT NOT NULL,
      details     TEXT
    )
  `);

  const service = new DataService(mq, timescale, postgres);

  let stopping = false;
  const shutdown = async (signal: string) => {
    if (stopping) return;
    stopping = true;
    console.log(`[run] ${signal} alindi, kapatiliyor...`);
    await service.stop();
    process.exit(0);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  await service.start();
  console.log("[run] Hazir. WRITE_TELEMETRY job'lari bekleniyor...");
}

main().catch((err) => {
  console.error("[run] Kritik hata:", err);
  process.exit(1);
});
