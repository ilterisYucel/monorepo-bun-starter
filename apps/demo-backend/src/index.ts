import {
  RedisConnection,
  BullMQAdapter,
  TimescaleDBAdapter,
} from "@gd-monorepo/core";
import { XRackManager } from "./infrastructure/xrack-manager";
import { ModbusDevice } from "@gd-monorepo/core";
import { DeviceJobHandler } from "./application/device-job-handler";
import { PowerCommandHandler } from "./application/power-command-handler";
import { FastifyServer } from "./infrastructure/api/server";
import { racksRoutes } from "./infrastructure/api/racks";
import { createModbusConfig, RACK_COUNT, TICK_SECONDS } from "./config";

async function main() {
  console.log("[Demo Backend] Starting...");

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
    host: process.env.TIMESCALE_HOST || "localhost",
    port: parseInt(process.env.TIMESCALE_PORT || "5432"),
    user: process.env.TIMESCALE_USER || "postgres",
    password: process.env.TIMESCALE_PASSWORD || "password",
    database: process.env.TIMESCALE_DATABASE || "battery",
    maxConnections: parseInt(process.env.TIMESCALE_POOL_SIZE || "20"),
  });

  // 4. Redis ve Message Queue
  const redis = new RedisConnection({
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379"),
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
    port: parseInt(process.env.PORT || "5000"),
    host: process.env.HOST || "0.0.0.0",
    http2: process.env.HTTP2 === "true",
  });

  // Routes'u kaydet
  const app = server.getApp();
  await app.register(
    async (fastify) => {
      await racksRoutes(fastify, {
        timescale,
        powerHandler,
        deviceId: modbusConfig.id,
      });
    },
    { prefix: "/api/racks" },
  );

  await server.start();

  // 8. Repeatable READ job ekle (her 5 saniyede bir)
  await messageQueue.addRepeatableJob(
    "read-xrack",
    {
      jobId: "read-xrack",
      type: "READ_DEVICE",
      deviceId: modbusConfig.id,
      timestamp: new Date().toISOString(),
    },
    `*/${TICK_SECONDS} * * * * *`,
  );

  console.log("[Demo Backend] Ready");

  // Graceful shutdown
  const shutdown = async () => {
    console.log("[Demo Backend] Shutting down...");
    await server.stop();
    await messageQueue.close();
    await redis.disconnect();
    await timescale.close();
    await modbusDevice.disconnect();
    xrackManager.stop();
    process.exit(0);
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

main().catch(console.error);
