import { createContainer, asFunction, asValue } from "awilix";
import { PostgresAdapter, TimescaleDBAdapter, RedisConnection, MaterializedViewManager } from "@gd-monorepo/core";
import { TamperLogger, ConsoleSink, FileSink, TimescaleSink, LOG_EVENTS_DDL } from "@gd-monorepo/tamper-logger";

import type { ISqlDatabase } from "@gd-monorepo/core";
import type { ILogSink } from "@gd-monorepo/tamper-logger";

import {
  createConfigLoader,
  authConfig,
  serverConfig,
  postgresConfig,
  timescaleDBConfig,
  redisConfig,
  seedUsers,
  serviceTier,
  deviceConfigDir,
  logConfig,
  hubConsumerConfig,
} from "./default";
import { resolveSigningKey } from "@gd-monorepo/tamper-logger";

import { PlatformMessageQueue } from "@gd-monorepo/platform-messaging";
import { isLogEventCode } from "@gd-monorepo/platform-logging";
import type { LogEventCode } from "@gd-monorepo/platform-logging";

import { TamperLoggerAdapter } from "../infrastructure/logging/tamper-logger-adapter";
import { registerContainerTier } from "../tiers/container/registrations";
import { registerFieldTier } from "../tiers/field/registrations";
import { registerBossTier } from "../tiers/boss/registrations";
import { ExecuteCommandUseCase } from "../application/commands/execute-command-use-case";
import { ListCatalogUseCase } from "../application/commands/list-catalog-use-case";
import { OperationRunsUseCase } from "../application/commands/operation-runs-use-case";
import { OperationDefinitionsUseCase } from "../application/commands/operation-definitions-use-case";
import { DeviceRegistry } from "../infrastructure/persistence/device-registry";
import { OperationRunStore } from "../infrastructure/persistence/operation-run-store";
import { OperationDefStore } from "../infrastructure/persistence/operation-def-store";
import { loadTierManeuverRecords } from "../infrastructure/commands/load-maneuver-records";
import { CommandChannel } from "../infrastructure/commands/command-channel";
import { DeviceRegistryTargets } from "../infrastructure/commands/device-registry-targets";
import { ManeuverRegistry, OperationExecutor, CommandJobBuilder, DeviceConfigFileSource } from "@gd-monorepo/platform-commands";
import { OtpLibTotpService } from "../infrastructure/auth/otplib-totp-service";
import { RedisLoginThrottle } from "../infrastructure/auth/redis-login-throttle";
import { RedisTotpThrottle } from "../infrastructure/auth/redis-totp-throttle";
import { MfaLoginUseCase } from "../application/use-cases/mfa-login-use-case";
import { MfaEnrollUseCase } from "../application/use-cases/mfa-enroll-use-case";
import { SyslogSink, HttpWebhookSink, SmtpNotifier, HttpSmsNotifier } from "@gd-monorepo/tamper-logger";

import { alertSinkConfigs } from "./default";

/**
 * Faz 6 T6.7 — bildirim kuralları: bu eventCode'lar cooldown'lu mail/SMS
 * notifier'larına iletilir (güvenlik-kritik + altyapı olayları).
 */
const DEFAULT_ALERT_EVENT_CODES: LogEventCode[] = [
  "login_locked",
  "mfa_enrolled",
  "mfa_reset",
  "session_anomaly",
  "device_alarm",
  "tamper_detected",
  "audit_sink_failure",
];
import { LoginUseCase } from "../application/use-cases/login-use-case";
import { RefreshTokenUseCase } from "../application/use-cases/refresh-token-use-case";
import { LogoutUseCase } from "../application/use-cases/logout-use-case";
import { ChangePasswordUseCase } from "../application/use-cases/change-password-use-case";
import { CreateUserUseCase } from "../application/use-cases/create-user-use-case";
import { UpdateUserUseCase } from "../application/use-cases/update-user-use-case";
import { DeleteUserUseCase } from "../application/use-cases/delete-user-use-case";
import { ListUsersUseCase } from "../application/use-cases/list-users-use-case";
import { TokenAdapter } from "../infrastructure/auth/token-adapter";
import { UserRepository } from "../infrastructure/persistence/user-repository";
import { BunPasswordHasher } from "../infrastructure/auth/bun-password-hasher";
import { RealtimeManager } from "../infrastructure/realtime/realtime-manager";
import { HubConsumerClient } from "../infrastructure/hub-tunnel";
import { RequestContext } from "../presentation/middleware/request-context";
import { WebServiceServer } from "../presentation/server";
import type { ConfigLoader } from "@gd-monorepo/shared-utils";

/**
 * TamperLogger'ı kurar (bootstrap — main()'de await'lenir).
 *
 * NOT: awilix v11 async factory'lerin sonucunu AWAIT'LEMEZ — `cradle.logger`
 * bir Promise döner ve tüketicilerde `logger.log is not a function` hatasına
 * yol açar (canlı stack çökmesi — 2026-08-25). Bu yüzden logger burada
 * bağımsız kurulur ve main()'de `asValue` ile kaydedilir.
 */
export async function buildTamperLogger(
  config: ConfigLoader,
  postgres: ISqlDatabase,
): Promise<TamperLogger> {
  const cfg = logConfig(config);
  const signingKey = await resolveSigningKey(
    cfg.signingKeyPath,
    process.env.LOG_SIGNING_KEY,
  );
  const sinks: ILogSink[] = [];
  if (cfg.sinks.includes("console")) {
    sinks.push(new ConsoleSink());
  }
  if (cfg.sinks.includes("file") && cfg.filePath !== undefined) {
    sinks.push(new FileSink({ path: cfg.filePath }));
  }
  if (cfg.sinks.includes("timescale")) {
    await postgres.execute(LOG_EVENTS_DDL);
    sinks.push(new TimescaleSink({ executor: postgres }));
  }

  // Faz 6 T6.2: SIEM sink'leri — yalnızca config verilmişse kurulur.
  const alertCfg = alertSinkConfigs(config);
  if (cfg.sinks.includes("syslog") && alertCfg.syslog) {
    sinks.push(new SyslogSink(alertCfg.syslog));
  }
  if (cfg.sinks.includes("webhook") && alertCfg.webhook) {
    sinks.push(new HttpWebhookSink(alertCfg.webhook));
  }

  // Faz 6 T6.7: bildirim adapterleri — AlertNotifier (cooldown) üzerinden,
  // yalnızca alert kuralları listesindeki eventCode'lar için.
  const notifierSinks: ILogSink[] = [];
  if (cfg.sinks.includes("smtp") && alertCfg.smtp) {
    notifierSinks.push(new SmtpNotifier(alertCfg.smtp));
  }
  if (cfg.sinks.includes("sms") && alertCfg.sms) {
    notifierSinks.push(new HttpSmsNotifier(alertCfg.sms));
  }

  return new TamperLogger({
    signingKey,
    service: "web-service",
    sinks,
    level: cfg.level,
    redactionKeys: cfg.redactionKeys,
    batchSize: cfg.batchSize,
    batchIntervalMs: cfg.batchIntervalMs,
    ringBufferSize: cfg.ringBufferSize,
    eventCodeValidator: isLogEventCode,
    ...(notifierSinks.length > 0
      ? {
          alertRules: {
            sinks: notifierSinks,
            eventCodes: DEFAULT_ALERT_EVENT_CODES,
          },
        }
      : {}),
  });
}

export function buildContainer() {
  const container = createContainer();

  container.register({
    config: asValue(createConfigLoader()),

    // Config degerleri — ConfigLoader'dan turetilir
    authCfg: asFunction(({ config }) => authConfig(config)).singleton(),
    serverCfg: asFunction(({ config }) => serverConfig(config)).singleton(),
    pgCfg: asFunction(({ config }) => postgresConfig(config)).singleton(),
    tsCfg: asFunction(({ config }) => timescaleDBConfig(config)).singleton(),
    redisCfg: asFunction(({ config }) => redisConfig(config)).singleton(),
    seed: asValue(seedUsers()),

    // Altyapi adapter'lari
    postgres: asFunction(({ pgCfg }) => new PostgresAdapter(pgCfg)).singleton(),
    timescale: asFunction(
      ({ tsCfg }) => new TimescaleDBAdapter(tsCfg),
    ).singleton(),

    redis: asFunction(
      ({ redisCfg }) => new RedisConnection(redisCfg),
    ).singleton(),

    mq: asFunction(
      ({ redis }) => new PlatformMessageQueue(redis),
    ).singleton(),

    mvManager: asFunction(
      ({ timescale }) => new MaterializedViewManager(timescale),
    ).singleton(),

    realtime: asFunction(
      ({ redis }) => new RealtimeManager(redis),
    ).singleton(),

    // Log altyapısı (TamperLogger — Faz 0 T0.5/T0.6).
    // asValue ile KAYDEDİLMEZ: awilix v11 async factory'leri await'lemez.
    // Logger, main()'de `buildTamperLogger` ile kurulur ve
    // `container.register({ logger: asValue(logger) })` ile enjekte edilir.

    requestContext: asFunction(() => new RequestContext()).singleton(),

    // K12: use-case'ler somut TamperLogger yerine IAuditLog portunu tüketir.
    auditLog: asFunction(({ logger }) => new TamperLoggerAdapter(logger)).singleton(),

    // ── KOMUT-MANEVRA-OPERASYON Faz B/C — kayıt/yürütme/tünel kanalları ──

    operationDefStore: asFunction(
      ({ postgres }) => new OperationDefStore(postgres),
    ).singleton(),

    // Devices önbelleği — hedef çözümleme (§5.1) + unified rotalar.
    deviceRegistry: asFunction(
      ({ postgres }) => new DeviceRegistry(postgres),
    ).singleton(),

    maneuverRegistry: asFunction(
      ({ config, operationDefStore }) => {
        const dir = process.env.MANEUVER_CONFIG_DIR ?? deviceConfigDir(config);
        const records = loadTierManeuverRecords(dir);
        return new ManeuverRegistry({
          maneuvers: records.maneuvers,
          operations: records.operations,
          source: operationDefStore,
        });
      },
    ).singleton(),

    operationRunStore: asFunction(
      ({ postgres }) => new OperationRunStore(postgres),
    ).singleton(),

    maneuverExecutor: asFunction(
      ({
        config,
        maneuverRegistry,
        operationRunStore,
        mq,
        deviceRegistry,
        tunnelManeuverChannel,
        fieldInterlock,
        logger,
      }) => {
        const targets = new DeviceRegistryTargets(deviceRegistry);
        const channel = new CommandChannel({
          builder: new CommandJobBuilder({
            source: new DeviceConfigFileSource(deviceConfigDir(config)),
          }),
          mq,
        });
        return new OperationExecutor({
          registry: maneuverRegistry,
          targets,
          channel,
          runs: operationRunStore,
          ...(tunnelManeuverChannel
            ? { remoteChannel: tunnelManeuverChannel }
            : {}),
          ...(fieldInterlock ? { preconditions: fieldInterlock } : {}),
          logger,
        });
      },
    ).singleton(),

    // UC-3: manevra/operasyon use-case'leri — route'lar yalnız bunları çağırır.
    executeCommandUseCase: asFunction(({ maneuverExecutor }) =>
      maneuverExecutor ? new ExecuteCommandUseCase(maneuverExecutor) : undefined,
    ).singleton(),
    catalogUseCase: asFunction(({ maneuverRegistry }) =>
      new ListCatalogUseCase(maneuverRegistry),
    ).singleton(),
    operationRunsUseCase: asFunction(({ operationRunStore }) =>
      new OperationRunsUseCase(operationRunStore),
    ).singleton(),
    operationDefinitionsUseCase: asFunction(({ operationDefStore, auditLog }) =>
      new OperationDefinitionsUseCase(operationDefStore, auditLog),
    ).singleton(),

    // P3: hub-servis consumer (HUB_MODE=hub iken kurulur).
    hubConsumer: asFunction(({ config }) =>
      hubConsumerConfig(config, serviceTier(config)),
    ).singleton(),
    hubConsumerClient: asFunction(({ hubConsumer }) =>
      hubConsumer ? new HubConsumerClient(hubConsumer) : undefined,
    ).singleton(),
    // Repository ve Use-Case'ler
    userRepo: asFunction(
      ({ postgres }) => new UserRepository(postgres),
    ).singleton(),
    tokens: asFunction(
      ({ authCfg }) => new TokenAdapter(authCfg),
    ).singleton(),
    hasher: asFunction(() => new BunPasswordHasher()).singleton(),
    // Faz 6 T6.1 — TOTP servisi (RFC 6238, otplib)
    totp: asFunction(
      () => new OtpLibTotpService({ issuer: "GD-EMS" }),
    ).singleton(),
    // Faz 6 T6.6 — Redis tabanlı giriş kilidi (RedisConnection paylaşılır)
    loginThrottle: asFunction(
      ({ redis, authCfg }) =>
        new RedisLoginThrottle(redis, {
          maxFailures: authCfg.loginMaxFailures,
          windowSeconds: authCfg.loginWindowSeconds,
          lockSeconds: authCfg.loginLockSeconds,
        }),
    ).singleton(),

    // 2026-08-30 T1.6 — Redis tabanlı TOTP deneme kilidi (ASVS V3.5.2)
    totpThrottle: asFunction(
      ({ redis, authCfg }) =>
        new RedisTotpThrottle(redis, {
          maxFailures: authCfg.totpMaxFailures,
          windowSeconds: authCfg.totpWindowSeconds,
          lockSeconds: authCfg.totpLockSeconds,
        }),
    ).singleton(),

    loginUseCase: asFunction(
      ({ userRepo, tokens, hasher, auditLog, loginThrottle }) =>
        new LoginUseCase(userRepo, tokens, hasher, auditLog, loginThrottle),
    ).singleton(),
    mfaLoginUseCase: asFunction(
      ({ userRepo, tokens, totp, auditLog, totpThrottle }) =>
        new MfaLoginUseCase(userRepo, tokens, totp, auditLog, totpThrottle),
    ).singleton(),
    mfaEnrollUseCase: asFunction(
      ({ userRepo, totp, tokens, auditLog, totpThrottle }) =>
        new MfaEnrollUseCase(userRepo, totp, tokens, auditLog, totpThrottle),
    ).singleton(),
    refreshTokenUseCase: asFunction(
      ({ userRepo, tokens }) =>
        new RefreshTokenUseCase(userRepo, tokens),
    ).singleton(),
    logoutUseCase: asFunction(
      ({ userRepo }) => new LogoutUseCase(userRepo),
    ).singleton(),
    changePasswordUseCase: asFunction(
      ({ userRepo, hasher, tokens }) =>
        new ChangePasswordUseCase(userRepo, hasher, tokens),
    ).singleton(),
    createUserUseCase: asFunction(
      ({ userRepo, hasher }) => new CreateUserUseCase(userRepo, hasher),
    ).singleton(),
    updateUserUseCase: asFunction(
      ({ userRepo, hasher }) => new UpdateUserUseCase(userRepo, hasher),
    ).singleton(),
    deleteUserUseCase: asFunction(
      ({ userRepo }) => new DeleteUserUseCase(userRepo),
    ).singleton(),
    listUsersUseCase: asFunction(
      ({ userRepo }) => new ListUsersUseCase(userRepo),
    ).singleton(),

    server: asFunction(
      ({ serverCfg }) => new WebServiceServer(serverCfg),
    ).singleton(),
  });

  // K5/K14: core kayıtlarının ardından tier kompozisyonları eklenir.
  registerContainerTier(container);
  registerFieldTier(container);
  registerBossTier(container);

  return container;
}
