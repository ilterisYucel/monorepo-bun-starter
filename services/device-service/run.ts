import { RedisConnection } from "@gd-monorepo/core";
import { TamperLogger, ConsoleSink, FileSink, resolveSigningKey } from "@gd-monorepo/tamper-logger";

import { PlatformMessageQueue } from "@gd-monorepo/platform-messaging";
import { loggerConfigForTier, isLogEventCode } from "@gd-monorepo/platform-logging";
import { ServiceTier } from "@gd-monorepo/core";
import type { ILogSink } from "@gd-monorepo/tamper-logger";

import type { LogLevel } from "@gd-monorepo/tamper-logger";

import { ConfigLoader, EnvSource, ALL_CONFIG_DEFINITIONS } from "@gd-monorepo/shared-utils";
import { DeviceService } from "./src/device-service";

/** ConfigLoader'dan TamperLogger üretir (T0.5/T0.11 wiring). */
async function buildLogger(config: ConfigLoader): Promise<TamperLogger> {
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

  const configDir = config.get<string>("device.configDir");
  console.log(`[run] Konfigurasyon dizini: ${configDir}`);

  const redis = new RedisConnection({
    host: config.get<string>("redis.host"),
    port: config.get<number>("redis.port"),
    password: config.get<string | undefined>("redis.password"),
    db: config.get<number | undefined>("redis.db"),
  });
  const mq = new PlatformMessageQueue(redis);

  const logger = await buildLogger(config);

  // Site kimligi: container-level app CONTAINER_ID, field-level app FIELD_ID
  // env'i ile telemetriye otomatik tag olarak eklenir (bkz. TelemetryTagger).
  const identity = {
    containerId: config.get<string | undefined>("site.containerId"),
    fieldId: config.get<string | undefined>("site.fieldId"),
  };

  const service = await DeviceService.fromConfigDir(configDir, mq, identity, logger);

  let stopping = false;
  const shutdown = async (signal: string) => {
    if (stopping) return;
    stopping = true;
    console.log(`[run] ${signal} alindi, kapatiliyor...`);
    await service.stop();
    await logger.close();
    process.exit(0);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  await service.start();
  console.log("[run] Hazir. BullMQ job'lari bekleniyor...");
}

main().catch((err) => {
  console.error("[run] Kritik hata:", err);
  process.exit(1);
});
