import { buildContainer } from "./config/container";
import type { ServerDependencies } from "./presentation/server";
import { deviceConfigDir } from "./config/default";

export async function main() {
  console.log("[run] Web Service baslatiliyor...");

  const container = buildContainer();
  const c = container.cradle as Record<string, unknown>;

  const postgres = c.postgres as any;
  const timescale = c.timescale as any;
  const userRepo = c.userRepo as any;
  const server = c.server as any;
  const seed = c.seed as any;
  const serverCfg = c.serverCfg as any;
  const realtime = c.realtime as any;
  const redis = c.redis as any;
  const mvManager = c.mvManager as any;
  const mq = c.mq as any;

  const deps: ServerDependencies = {
    serverConfig: serverCfg,
    timescale,
    postgres,
    tokens: c.tokens as any,
    userRepo: c.userRepo as any,
    loginUseCase: c.loginUseCase as any,
    refreshTokenUseCase: c.refreshTokenUseCase as any,
    logoutUseCase: c.logoutUseCase as any,
    createUserUseCase: c.createUserUseCase as any,
    updateUserUseCase: c.updateUserUseCase as any,
    deleteUserUseCase: c.deleteUserUseCase as any,
    listUsersUseCase: c.listUsersUseCase as any,
    realtime,
    mvManager,
    mq,
    configDir: deviceConfigDir(),
  };

  await postgres.connect();
  await redis.connect();
  await userRepo.initialize(seed);

  await mq.registerWorkerFor("WS_BROADCAST", async (job: any) => {
    if (job.type === "WS_BROADCAST") {
      const byDevice = new Map<string, any[]>();

      for (const t of job.telemetries) {
        if (!byDevice.has(t.deviceId)) {
          byDevice.set(t.deviceId, []);
        }
        byDevice.get(t.deviceId)!.push(t);
      }

      for (const [deviceId, data] of byDevice) {
        await realtime.writeBatchToRingBuffer(deviceId, data);
        realtime.broadcast(deviceId, { type: "telemetry", deviceId, data });
      }
    }
  }, { concurrency: 10 });

  let stopping = false;
  const shutdown = async (signal: string) => {
    if (stopping) return;
    stopping = true;
    console.log(`[run] ${signal} alindi, kapatiliyor...`);
    await server.stop();
    await mq.close();
    await timescale.close();
    await postgres.disconnect();
    await redis.disconnect();
    process.exit(0);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  await server.start(deps);
  console.log("[run] Hazir.");
}
