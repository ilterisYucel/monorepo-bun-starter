import { RedisConnection, BullMQAdapter } from "@gd-monorepo/core";
import { ConfigLoader, EnvSource, ALL_CONFIG_DEFINITIONS } from "@gd-monorepo/shared-utils";
import { DeviceService } from "./src/device-service";

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
  const mq = new BullMQAdapter(redis);

  // Site kimligi: container-level app CONTAINER_ID, field-level app FIELD_ID
  // env'i ile telemetriye otomatik tag olarak eklenir (bkz. TelemetryTagger).
  const identity = {
    containerId: config.get<string | undefined>("site.containerId"),
    fieldId: config.get<string | undefined>("site.fieldId"),
  };

  const service = await DeviceService.fromConfigDir(configDir, mq, identity);

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
  console.log("[run] Hazir. BullMQ job'lari bekleniyor...");
}

main().catch((err) => {
  console.error("[run] Kritik hata:", err);
  process.exit(1);
});
