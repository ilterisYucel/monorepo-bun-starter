import { RedisConnection, PostgresAdapter } from "@gd-monorepo/core";
import {
  TamperLogger,
  ConsoleSink,
  FileSink,
  TimescaleSink,
  resolveSigningKey,
} from "tamper-logger";

import { PlatformMessageQueue } from "@gd-monorepo/platform-messaging";
import { loggerConfigForTier, isLogEventCode, LOG_EVENTS_DDL } from "@gd-monorepo/platform-logging";
import { ServiceTier } from "@gd-monorepo/core";
import type { ILogSink } from "tamper-logger";

import type { LogLevel } from "@gd-monorepo/platform-logging";

import { ConfigLoader, EnvSource, ALL_CONFIG_DEFINITIONS } from "@gd-monorepo/shared-utils";
import { Logger } from "@gd-monorepo/logger";
import type { LogLevel as OpsLevel } from "@gd-monorepo/logger";
import { buildDeviceRuntime } from "./src/runtime";

/** TamperLogger seviyesini operasyonel logger seviyesine eşler (fatal → error). */
function toOpsLevel(level: string): OpsLevel {
  if (level === "fatal") return "error";
  if (level === "debug" || level === "warn" || level === "error") return level;
  return "info";
}

/** ConfigLoader'dan TamperLogger üretir; field/boss tier'da timescale sink ekler (B1). */
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
    service: "device-service",
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
  console.log("[run] Device Service baslatiliyor...");

  // Konfigürasyon yukleme (oncelik: process.env > varsayilan)
  const config = new ConfigLoader(ALL_CONFIG_DEFINITIONS, [
    new EnvSource(),
  ]);
  config.load();
  console.log("[run] Konfigürasyon:", config.redacted());

  const opsLogger = new Logger({
    service: "device-service",
    level: toOpsLevel(config.get<string>("log.level")),
  });

  const configDir = config.get<string>("device.configDir");
  opsLogger.info(`Konfigurasyon dizini: ${configDir}`);

  const redis = new RedisConnection({
    host: config.get<string>("redis.host"),
    port: config.get<number>("redis.port"),
    password: config.get<string | undefined>("redis.password"),
    db: config.get<number | undefined>("redis.db"),
  });
  const mq = new PlatformMessageQueue(redis);

  // PostgreSQL — alarm durum tablosu (DeviceService içi) + timescale log sink (B1).
  const postgres = new PostgresAdapter({
    host: config.get<string>("postgresql.host"),
    port: config.get<number>("postgresql.port"),
    user: config.get<string>("postgresql.user"),
    password: config.get<string>("postgresql.password"),
    database: config.get<string>("postgresql.database"),
    maxConnections: config.get<number>("postgresql.maxConnections"),
  });
  await postgres.connect();

  const logger = await buildLogger(config, postgres);

  // Site kimligi: container-level app CONTAINER_ID, field-level app FIELD_ID
  // env'i ile telemetriye otomatik tag olarak eklenir (bkz. TelemetryTagger).
  const identity = {
    containerId: config.get<string | undefined>("site.containerId"),
    fieldId: config.get<string | undefined>("site.fieldId"),
  };

  const runtime = await buildDeviceRuntime(configDir, mq, identity, logger, opsLogger);
  opsLogger.info(`${runtime.deviceCount} cihaz config'i yuklendi`);
  const service = runtime.service;

  let stopping = false;
  const shutdown = async (signal: string) => {
    if (stopping) return;
    stopping = true;
    opsLogger.info(`${signal} alindi, kapatiliyor...`);
    await service.stop();
    await logger.close();
    await opsLogger.close();
    process.exit(0);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  await service.start();
  opsLogger.info("Hazir. BullMQ job'lari bekleniyor...");
}

main().catch((err) => {
  console.error("[run] Kritik hata:", err);
  process.exit(1);
});
