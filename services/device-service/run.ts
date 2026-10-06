import { RedisConnection, PostgresAdapter } from "@gd-monorepo/core";
import {
  TamperLogger,
  ConsoleSink,
  FileSink,
  TimescaleSink,
  resolveSigningKey,
  LOG_EVENTS_DDL,
} from "@gd-monorepo/tamper-logger";

import { PlatformMessageQueue } from "@gd-monorepo/platform-messaging";
import { loggerConfigForTier, isLogEventCode } from "@gd-monorepo/platform-logging";
import { ServiceTier } from "@gd-monorepo/core";
import type { ILogSink } from "@gd-monorepo/tamper-logger";

import type { LogLevel } from "@gd-monorepo/tamper-logger";

import { ConfigLoader, EnvSource, ALL_CONFIG_DEFINITIONS } from "@gd-monorepo/shared-utils";
import { Logger } from "@gd-monorepo/logger";
import type { LogLevel as OpsLevel } from "@gd-monorepo/logger";
import { SimulatorHost } from "@gd-monorepo/simulators";
import { DeviceService } from "./src/device-service";
import { DeviceConfigLoader } from "./src/config-loader";

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

  // BSC→PCS connector BMS hedef override (deployment-bazlı — aws-edge:
  // field-device-service, standalone: host.docker.internal). Verilmezse
  // mapping dosyasındaki sabit hedef kullanılır.
  const bmsTargetHost = config.get<string | undefined>("device.bmsTargetHost");
  const bmsTargetPort = config.get<number | undefined>("device.bmsTargetPort");
  const bmsTarget =
    bmsTargetHost !== undefined || bmsTargetPort !== undefined
      ? { host: bmsTargetHost, port: bmsTargetPort }
      : undefined;

  // Self-host simülatörler (BSC/… + BSC→PCS connector) — device-service TCP okur.
  const { devices: deviceConfigs } = new DeviceConfigLoader(configDir, opsLogger).load();
  const host = new SimulatorHost(deviceConfigs, {
    configDir,
    ...(bmsTarget ? { bmsTarget } : {}),
  });
  await host.start();

  const service = await DeviceService.fromConfigDir(configDir, mq, identity, logger, opsLogger);

  let stopping = false;
  const shutdown = async (signal: string) => {
    if (stopping) return;
    stopping = true;
    opsLogger.info(`${signal} alindi, kapatiliyor...`);
    await service.stop();
    await host.stopAll();
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
