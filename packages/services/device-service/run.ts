import { RedisConnection, BullMQAdapter } from "@gd-monorepo/core";
import { DeviceService } from "./src/device-service";

function configDir(): string {
  return process.env.DEVICE_CONFIG_DIR ?? "./config";
}

function redisConfig() {
  return {
    host: process.env.REDIS_HOST ?? "127.0.0.1",
    port: parseInt(process.env.REDIS_PORT ?? "6379", 10),
    password: process.env.REDIS_PASSWORD,
    db: process.env.REDIS_DB ? parseInt(process.env.REDIS_DB, 10) : undefined,
  };
}

async function main() {
  console.log("[run] Device Service baslatiliyor...");
  console.log(`[run] Konfigurasyon dizini: ${configDir()}`);

  const redis = new RedisConnection(redisConfig());
  const mq = new BullMQAdapter(redis);
  const service = await DeviceService.fromConfigDir(configDir(), mq);

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
