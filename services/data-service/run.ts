import { RedisConnection, TimescaleDBAdapter, PostgresAdapter } from "@gd-monorepo/core";
import { TamperLogger, ConsoleSink, FileSink, TimescaleSink, resolveSigningKey, LOG_EVENTS_DDL } from "@gd-monorepo/tamper-logger";

import { PlatformMessageQueue } from "@gd-monorepo/platform-messaging";
import { loggerConfigForTier, isLogEventCode } from "@gd-monorepo/platform-logging";
import { ServiceTier } from "@gd-monorepo/core";
import type { ILogSink } from "@gd-monorepo/tamper-logger";

import type { LogLevel } from "@gd-monorepo/tamper-logger";

import { ConfigLoader, EnvSource, ALL_CONFIG_DEFINITIONS } from "@gd-monorepo/shared-utils";
import { DataService } from "./src/data-service";

/** ConfigLoader'dan TamperLogger üretir; field/boss tier'da timescale sink ekler. */
async function buildLogger(
  config: ConfigLoader,
  postgres: PostgresAdapter,
): Promise<TamperLogger> {
  const tier = config.get<ServiceTier>("service.tier");
  const filePath = config.get<string | undefined>("log.filePath");
  const cfg = loggerConfigForTier(tier, {
    level: config.get<LogLevel>("log.level"),
    signingKeyPath: config.get<string>("log.signingKeyPath"),
    ...(filePath !== undefined ? { filePath } : {}),
  });
  const signingKey = await resolveSigningKey(
    cfg.signingKeyPath,
    process.env.LOG_SIGNING_KEY,
  );
  const sinks: ILogSink[] = [];
  if (cfg.sinks.includes("console")) sinks.push(new ConsoleSink());
  if (cfg.sinks.includes("file") && cfg.filePath !== undefined) {
    sinks.push(new FileSink({ path: cfg.filePath }));
  }
  if (cfg.sinks.includes("timescale")) {
    await postgres.execute(LOG_EVENTS_DDL);
    sinks.push(new TimescaleSink({ executor: postgres }));
  }
  return new TamperLogger({
    signingKey,
    service: "data-service",
    sinks,
    level: cfg.level,
    redactionKeys: cfg.redactionKeys,
    batchSize: cfg.batchSize,
    batchIntervalMs: cfg.batchIntervalMs,
    ringBufferSize: cfg.ringBufferSize,
    eventCodeValidator: isLogEventCode,
  });
}

async function main() {
  console.log("[run] Data Service baslatiliyor...");

  // Konfigürasyon yukleme (oncelik: process.env > varsayilan)
  const config = new ConfigLoader(ALL_CONFIG_DEFINITIONS, [
    new EnvSource(),
  ]);
  config.load();
  console.log("[run] Konfigürasyon:", config.redacted());

  // Redis
  const redis = new RedisConnection({
    host: config.get<string>("redis.host"),
    port: config.get<number>("redis.port"),
    password: config.get<string | undefined>("redis.password"),
    db: config.get<number | undefined>("redis.db"),
  });
  const mq = new PlatformMessageQueue(redis);

  // TimescaleDB
  const timescale = new TimescaleDBAdapter({
    host: config.get<string>("timescale.host"),
    port: config.get<number>("timescale.port"),
    user: config.get<string>("timescale.user"),
    password: config.get<string>("timescale.password"),
    database: config.get<string>("timescale.database"),
    maxConnections: config.get<number>("timescale.maxConnections"),
    chunkInterval: config.get<string>("timescale.chunkInterval"),
    compressAfter: config.get<string>("timescale.compressAfter"),
    retentionAfter: config.get<string>("timescale.retentionAfter"),
    statementTimeoutMs: config.get<number>("timescale.statementTimeoutMs"),
    idleTimeoutMs: config.get<number>("timescale.idleTimeoutMs"),
    connectionTimeoutMs: config.get<number>("timescale.connectionTimeoutMs"),
  });

  // PostgreSQL (system_logs tablosu icin)
  const postgres = new PostgresAdapter({
    host: config.get<string>("timescale.host"),
    port: config.get<number>("timescale.port"),
    user: config.get<string>("timescale.user"),
    password: config.get<string>("timescale.password"),
    database: config.get<string>("timescale.database"),
    maxConnections: config.get<number>("timescale.maxConnections"),
  });
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

  // Eski loglari temizle (30 gunden eski)
  try {
    await postgres.execute(
      "DELETE FROM system_logs WHERE timestamp < NOW() - INTERVAL '30 days'",
    );
    console.log("[run] Eski loglar temizlendi.");
  } catch (err) {
    console.error("[run] Log temizleme basarisiz:", err);
  }

  const service = new DataService(mq, timescale, postgres, await buildLogger(config, postgres));

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
