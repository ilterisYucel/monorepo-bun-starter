import {
  RedisConnection,
  BullMQAdapter,
  TimescaleDBAdapter,
} from "@gd-monorepo/core";
import { DataService } from "./src/data-service";

function redisConfig() {
  return {
    host: process.env.REDIS_HOST ?? "127.0.0.1",
    port: parseInt(process.env.REDIS_PORT ?? "6379", 10),
    password: process.env.REDIS_PASSWORD,
    db: process.env.REDIS_DB ? parseInt(process.env.REDIS_DB, 10) : undefined,
  };
}

function timescaleConfig() {
  return {
    host: process.env.TIMESCALE_HOST ?? "127.0.0.1",
    port: parseInt(process.env.TIMESCALE_PORT ?? "5432", 10),
    user: process.env.TIMESCALE_USER ?? "postgres",
    password: process.env.TIMESCALE_PASSWORD ?? "password",
    database: process.env.TIMESCALE_DATABASE ?? "battery",
    maxConnections: parseInt(process.env.TIMESCALE_POOL_SIZE ?? "20", 10),
  };
}

function workerConcurrency(): number {
  return parseInt(process.env.WORKER_CONCURRENCY ?? "5", 10);
}

async function main() {
  console.log("[run] Data Service baslatiliyor...");

  const redis = new RedisConnection(redisConfig());
  const mq = new BullMQAdapter(redis);

  const timescale = new TimescaleDBAdapter(timescaleConfig());

  const service = new DataService(mq, timescale);

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
