import { buildContainer, buildTamperLogger } from "./config/container";
import type { ServerDependencies } from "./presentation/server";
import { deviceConfigDir, serviceTier, siteFieldConfig } from "./config/default";
import { ensureSiteField } from "./infrastructure/persistence/site-field-seed";
import type { ConfigLoader } from "@gd-monorepo/shared-utils";
import { asValue } from "awilix";
import type { ISqlDatabase, ITimeseriesDatabase } from "@gd-monorepo/core";


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

  // Loggere bağlı OLMAYAN kaynaklar önce çözümlenir
  const config = c.config as ConfigLoader;
  const tier = serviceTier(config);
  // Field tier: FIELD_ID fail-fast kontrolü en başta (bağlantı kurulmadan).
  const siteField = siteFieldConfig(config, tier);
  const postgres = c.postgres as ISqlDatabase;
  const timescale = c.timescale as ITimeseriesDatabase;
  const userRepo = c.userRepo as any;
  const server = c.server as any;
  const seed = c.seed as any;
  const serverCfg = c.serverCfg as any;
  const authCfg = c.authCfg as any;
  const realtime = c.realtime as any;
  const redis = c.redis as any;
  const mvManager = c.mvManager as any;
  const mq = c.mq as any;
  const requestContext = c.requestContext as any;

  await retry("Postgres baglantisi", () => postgres.connect());
  await retry("Redis baglantisi", () => redis.connect());
  await userRepo.initialize(seed);

  // TamperLogger bootstrap — awilix v11 async factory'leri await'lemediği için
  // logger burada kurulur ve asValue ile kaydedilir (bkz. container.ts notu).
  const logger = await buildTamperLogger(config, postgres);
  container.register({ logger: asValue(logger) });

  const sessionStore = c.containerSessionStore as any;
  const containerSessionServer = c.containerSessionServer as any;
  const tunnelClient = c.tunnelClient as any;
  const sessionGateway = c.sessionGateway as any;
  const tunnelProxy = c.tunnelProxy as any;
  const sessionAudit = c.sessionAudit as any;
  const telemetryQueryResponder = c.telemetryQueryResponder as any;

  const deps: ServerDependencies = {
    serverConfig: serverCfg,
    timescale,
    postgres,
    tokens: c.tokens as any,
    userRepo: c.userRepo as any,
    loginUseCase: c.loginUseCase as any,
    refreshTokenUseCase: c.refreshTokenUseCase as any,
    logoutUseCase: c.logoutUseCase as any,
    changePasswordUseCase: c.changePasswordUseCase as any,
    createUserUseCase: c.createUserUseCase as any,
    updateUserUseCase: c.updateUserUseCase as any,
    deleteUserUseCase: c.deleteUserUseCase as any,
    listUsersUseCase: c.listUsersUseCase as any,
    mfaLoginUseCase: c.mfaLoginUseCase as any,
    mfaEnrollUseCase: c.mfaEnrollUseCase as any,
    mfaRequiredRoles: authCfg.mfaRequiredRoles,
    realtime,
    containerProxy: c.containerProxy as any,
    fieldPoller: c.fieldPoller as any,
    fieldConnector: c.fieldConnector as any,
    sessionStore,
    sessionGateway,
    tunnelProxy,
    mvManager,
    mq,
    configDir: deviceConfigDir(config),
    logger,
    requestContext,
  };

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
    if (containerSessionServer) containerSessionServer.stop();
    if (tunnelClient) tunnelClient.stop();
    if (telemetryQueryResponder) telemetryQueryResponder.stop();
    if (deps.containerProxy) await deps.containerProxy.stop();
    if (deps.sessionGateway) deps.sessionGateway.stop();
    if (deps.tunnelProxy) deps.tunnelProxy.stop();
    if (deps.fieldPoller) deps.fieldPoller.stop();
    if (deps.fieldConnector) await deps.fieldConnector.stop();
    await mq.close();
    await timescale.close();
    await postgres.disconnect();
    await redis.disconnect();
    await logger.close();
    process.exit(0);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  await server.start(deps);

  // Field tier: env'deki FIELD_ID için saha satırını seed et (ON CONFLICT
  // DO NOTHING) — elle POST /api/fields gerekmez. ensureSchema, server.start
  // sırasında fieldRoutes kaydıyla çalıştığı için tablo garantilidir.
  if (siteField) {
    await ensureSiteField(postgres, siteField);
    console.log(`[run] Saha kaydi hazir (${siteField.fieldId}).`);
  }

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
    // Faz 3 (field tier): session_audit şeması + gateway/tunnel observer'ları
    if (sessionAudit) {
      await sessionAudit.ensureSchema();
    }
    if (deps.sessionGateway) {
      deps.sessionGateway.initialize();
    }
    if (deps.tunnelProxy) {
      deps.tunnelProxy.initialize();
    }
  }
  if (deps.fieldPoller) {
    await deps.fieldPoller.start();
  }
  // Faz 2: FieldConnector sunucu dinlemeye başladıktan sonra bağlanır —
  // register ack'i beklemez; kendi backoff döngüsünü yönetir.
  if (deps.fieldConnector) {
    await deps.fieldConnector.start();
    // Faz 3 (container tier): tünel + oturum katmanları kanala abone olur
    if (tunnelClient) {
      tunnelClient.attach(deps.fieldConnector);
    }
    if (containerSessionServer) {
      containerSessionServer.start();
    }
    // Faz 5.1 B2: telemetry-query yanıtlayıcısı
    if (telemetryQueryResponder) {
      telemetryQueryResponder.start();
    }
  }

  console.log(`[run] Hazir (tier: ${tier}).`);
}
