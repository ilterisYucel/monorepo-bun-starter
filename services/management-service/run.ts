import { RedisConnection } from "@gd-monorepo/core";
import type { ServiceTier } from "@gd-monorepo/core";
import { PlatformMessageQueue } from "@gd-monorepo/platform-messaging";
import {
  TamperLogger,
  ConsoleSink,
  resolveSigningKey,
} from "@gd-monorepo/tamper-logger";
import type { ILogSink } from "@gd-monorepo/tamper-logger";
import { isLogEventCode } from "@gd-monorepo/platform-logging";
import { loggerConfigForTier } from "@gd-monorepo/platform-logging";
import { CommandJobBuilder, DeviceConfigFileSource } from "@gd-monorepo/platform-commands";

import { RuleConfigLoader } from "./src/rule-config-loader";
import { CycleSnapshotStore } from "./src/cycle-snapshot-store";
import { RuleEvaluator } from "./src/rule-evaluator";
import { ActionExecutor } from "./src/action-executor";
import { ManagementService } from "./src/management-service";

const DEFAULT_EVALUATION_INTERVAL_MS = 10_000;

/**
 * Management-service eventCode doğrulayıcısı — sözlük + kural bazlı dinamik
 * kodlar (`auto_rule_<kural-adı>`). Fail-closed: diğer her kod reddedilir.
 */
function isRuleEventCode(value: string): boolean {
  return isLogEventCode(value) || value.startsWith("auto_rule_");
}

/** Env + tier varsayılanlarından TamperLogger üretir (device-service deseni).
 *  `alertRules.eventCodes` = kural adlarından türetilen `auto_rule_<name>`
 *  kodları — notify aksiyonunun AlertNotifier'a yönlendirilmesini sağlar
 *  (Faz 6 T6.7 deseni). */
async function buildLogger(ruleNames: string[]): Promise<TamperLogger> {
  const tier: ServiceTier = (process.env.SERVICE_TIER ?? "container") as ServiceTier;
  const level = (process.env.LOG_LEVEL ?? "info") as "info";
  const filePath = process.env.LOG_FILE_PATH;
  const cfg = loggerConfigForTier(tier, {
    level,
    signingKeyPath: process.env.LOG_SIGNING_KEY_PATH ?? "/etc/gd-pms/log-signing.key",
    ...(filePath !== undefined ? { filePath } : undefined),
  });
  const signingKey = await resolveSigningKey(
    cfg.signingKeyPath,
    process.env.LOG_SIGNING_KEY,
  );
  const sinks: ILogSink[] = [];
  if (cfg.sinks.includes("console")) sinks.push(new ConsoleSink());
  return new TamperLogger({
    signingKey,
    service: "management-service",
    sinks,
    level: cfg.level,
    redactionKeys: cfg.redactionKeys,
    batchSize: cfg.batchSize,
    batchIntervalMs: cfg.batchIntervalMs,
    ringBufferSize: cfg.ringBufferSize,
    eventCodeValidator: isRuleEventCode,
    // MVP: bildirim sink'i console — SMTP/SMS adapter'leri Faz 6 deseninde
    // env ile bağlanacak (sink yapılandırması ileriki fazda).
    alertRules: {
      sinks: [new ConsoleSink()],
      eventCodes: ruleNames.map((name) => `auto_rule_${name}`),
      cooldownMs: 300_000,
    },
  });
}

async function main() {
  console.log("[run] Management Service baslatiliyor...");

  const rulesPath = process.env.MANAGEMENT_RULES_PATH ?? "config/rules.json";
  const deviceConfigDir =
    process.env.DEVICE_CONFIG_DIR ?? "../device-service/config";
  const evaluationIntervalMs = Number(
    process.env.MANAGEMENT_EVALUATION_INTERVAL_MS ??
      DEFAULT_EVALUATION_INTERVAL_MS,
  );
  const snapshotMaxAgeMs = evaluationIntervalMs * 3;

  console.log(`[run] Kurallar: ${rulesPath}`);
  console.log(`[run] Cihaz config: ${deviceConfigDir}`);
  console.log(`[run] Degerlendirme araligi: ${evaluationIntervalMs}ms`);

  // Fail-fast: kural dosyasi gecersizse servis ACILMAZ (MIMARISI §8).
  const loader = new RuleConfigLoader({ rulesPath, deviceConfigDir });
  const rules = loader.loadRules().rules;
  const catalog = loader.loadCatalog();
  console.log(`[run] ${rules.length} kural, ${catalog.resolveTargets(undefined).length} cihaz kayitli`);

  const redis = new RedisConnection({
    host: process.env.REDIS_HOST ?? "localhost",
    port: Number(process.env.REDIS_PORT ?? 6379),
    ...(process.env.REDIS_PASSWORD
      ? { password: process.env.REDIS_PASSWORD }
      : undefined),
  });
  const mq = new PlatformMessageQueue(redis);

  const logger = await buildLogger(rules.map((r) => r.name));

  const source = new DeviceConfigFileSource(deviceConfigDir);
  const builder = new CommandJobBuilder({ source });

  const snapshotStore = new CycleSnapshotStore({
    maxAgeMs: snapshotMaxAgeMs,
  });
  const evaluator = new RuleEvaluator(catalog);
  const executor = new ActionExecutor({
    builder,
    mq,
    logger,
  });

  const service = new ManagementService({
    mq,
    rules,
    evaluator,
    executor,
    snapshotStore,
    evaluationIntervalMs,
  });

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
  console.log("[run] Hazir. MANAGEMENT job'lari bekleniyor...");
}

main().catch((err) => {
  console.error("[run] Kritik hata:", err);
  process.exit(1);
});
