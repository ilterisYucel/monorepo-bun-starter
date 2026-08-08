import {
  RedisConnection,
  BullMQAdapter,
  TimescaleDBAdapter,
} from "@gd-monorepo/core";
import { ConfigLoader, EnvSource, ALL_CONFIG_DEFINITIONS } from "@gd-monorepo/shared-utils";
import { XRackManager } from "./infrastructure/xrack-manager";
import { ModbusDevice } from "@gd-monorepo/core";
import { DeviceJobHandler } from "./application/device-job-handler";
import { PowerCommandHandler } from "./application/power-command-handler";
import { FastifyServer } from "./infrastructure/api/server";
import { racksRoutes } from "./infrastructure/api/racks";
import { createModbusConfig, RACK_COUNT, TICK_SECONDS } from "./config";

async function main() {
  console.log("[Demo Backend] Starting...");

  // Konfigürasyon yukleme
  const config = new ConfigLoader(ALL_CONFIG_DEFINITIONS, [
    new EnvSource(),
  ]);
  config.load();
  console.log("[Demo Backend] Konfigürasyon:", config.redacted());

  // 1. Simülatörü başlat
  const xrackManager = new XRackManager(RACK_COUNT);
  xrackManager.start(TICK_SECONDS);
  const simulatorAdapter = xrackManager.getAdapter();

  // 2. Modbus Device (simülatöre bağlı)
  const modbusConfig = createModbusConfig();
  const modbusDevice = new ModbusDevice(modbusConfig, simulatorAdapter);
  await modbusDevice.connect();

  // 3. TimescaleDB
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

  // 4. Redis ve Message Queue
  const redis = new RedisConnection({
    host: config.get<string>("redis.host"),
    port: config.get<number>("redis.port"),
    password: config.get<string | undefined>("redis.password"),
    db: config.get<number | undefined>("redis.db"),
  });
  await redis.connect();
  const messageQueue = new BullMQAdapter(redis);

  // 5. Job Handler
  const jobHandler = new DeviceJobHandler(modbusDevice, timescale);
  await messageQueue.registerWorker(
    async (job) => {
      await jobHandler.handle(job);
    },
    { concurrency: 5 },
  );

  // 6. Power Command Handler
  const powerHandler = new PowerCommandHandler(modbusDevice);

  // 7. Fastify Server
  const server = new FastifyServer({
    port: config.get<number>("server.port"),
    host: config.get<string>("server.host"),
    http2: false,
  });

  // Routes'u kaydet
  const app = server.getApp();
  await app.register(
    async (fastify) => {
      await racksRoutes(fastify, { timescale, messageQueue, powerHandler });
    },
    { prefix: "/api" },
  );

  // 8. Graceful shutdown
  let stopping = false;
  const shutdown = async (signal: string) => {
    if (stopping) return;
    stopping = true;
    console.log(`[Demo Backend] ${signal} alindi, kapatiliyor...`);
    xrackManager.stop();
    await server.stop();
    await modbusDevice.disconnect();
    await messageQueue.close();
    await timescale.close();
    await redis.disconnect();
    process.exit(0);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  // 9. Başlat
  await server.start();
  console.log(`[Demo Backend] Hazir (port: ${config.get<number>("server.port")})`);
}

main().catch((err) => {
  console.error("[Demo Backend] Kritik hata:", err);
  process.exit(1);
});
