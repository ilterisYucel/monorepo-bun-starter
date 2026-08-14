import { buildContainer } from "./config/container";
import type { ServerDependencies } from "./presentation/server";
import { deviceConfigDir, serviceTier } from "./config/default";
import type { ConfigLoader } from "@gd-monorepo/shared-utils";

async function retry<T>(
  label: string,
  fn: () => Promise<T>,
  maxAttempts = 10,
  delayMs = 3000,
): Promise<T> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === maxAttempts) throw err;
      console.warn(
        `[run] ${label} basarisiz (${attempt}/${maxAttempts}), ${delayMs}ms sonra tekrar deneniyor...`,
      );
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw new Error("unreachable");
}

export async function main() {
  console.log("[run] Web Service baslatiliyor...");

  const container = buildContainer();
  const c = container.cradle as Record<string, unknown>;

  const config = c.config as ConfigLoader;
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
    containerProxy: c.containerProxy as any,
    fieldPoller: c.fieldPoller as any,
    mvManager,
    mq,
    configDir: deviceConfigDir(config),
  };

  await retry("Postgres baglantisi", () => postgres.connect());
  await retry("Redis baglantisi", () => redis.connect());
  await userRepo.initialize(seed);

  // Mevcut tüm cihazlar için retention, chunk ve compress ayarlarını uygula.
  // Bu çağrı, TimescaleDB'nin hypertable'larına add_retention_policy,
  // add_compression_policy ve set_chunk_time_interval komutlarını gönderir.
  // Eğer politikalar zaten varsa (if_not_exists => true) tekrar eklenmez.
  try {
    const devices = await postgres.query<{ id: string }>(
      "SELECT id FROM devices",
    );
    console.log(
      `[run] ${devices.length} cihaz icin retention kontrol ediliyor...`,
    );
    await Promise.allSettled(
      devices.map((d) => timescale.runRetention(d.id)),
    );
    console.log("[run] Retention politikasi kontrolu tamamlandi.");
  } catch (err) {
    console.error("[run] Retention kontrolu basarisiz (devam ediliyor):", err);
  }

  let stopping = false;
  const shutdown = async (signal: string) => {
    if (stopping) return;
    stopping = true;
    console.log(`[run] ${signal} alindi, kapatiliyor...`);
    await server.stop();
    if (deps.containerProxy) await deps.containerProxy.stop();
    if (deps.fieldPoller) deps.fieldPoller.stop();
    await mq.close();
    await timescale.close();
    await postgres.disconnect();
    await redis.disconnect();
    process.exit(0);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  await server.start(deps);

  try {
    await mq.registerWorkerFor("WS_BROADCAST", async (job: any) => {
      if (job.type === "WS_BROADCAST") {
        const byDevice = new Map<string, any[]>();

        for (const t of job.telemetries) {
          if (!byDevice.has(t.deviceId)) {
            byDevice.set(t.deviceId, []);
          }
          byDevice.get(t.deviceId)!.push(t);
        }

        await Promise.all(
          Array.from(byDevice).map(async ([deviceId, data]) => {
            await realtime.writeBatchToRingBuffer(deviceId, data);
            realtime.broadcast(deviceId, { type: "telemetry", deviceId, data });
          }),
        );
      }
    }, { concurrency: 5 });
    console.log("[run] BullMQ WS_BROADCAST worker kaydedildi.");
  } catch (err) {
    console.error("[run] BullMQ worker kaydi basarisiz:", err);
  }

  if (deps.containerProxy) {
    await deps.containerProxy.start();
  }
  if (deps.fieldPoller) {
    await deps.fieldPoller.start();
  }

  console.log(`[run] Hazir (tier: ${serviceTier(config)}).`);
}
