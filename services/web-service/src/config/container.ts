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
  logConfig,
  fieldConnectorConfig,
} from "./default";
import { resolveSigningKey } from "@gd-monorepo/tamper-logger";

import { PlatformMessageQueue } from "@gd-monorepo/platform-messaging";
import { isLogEventCode } from "@gd-monorepo/platform-logging";
import type { LogEventCode } from "@gd-monorepo/platform-logging";

import {
  FieldConnector,
  WsSocketClientFactory,
  ReconnectDelay,
  ContainerSessionStore,
  ContainerSessionServer,
  TunnelClient,
  FieldSessionStore,
  ContainerSessionGateway,
  TunnelProxy,
} from "@gd-monorepo/ws-tunnel";
import {
  RealtimeSnapshotSource,
  TelemetrySeriesSource,
  TelemetryQueryResponder,
} from "../infrastructure/field-connector";
import { JoseTokenSigner } from "../infrastructure/auth/jose-token-signer";
import { DeviceRegistry } from "../infrastructure/persistence/device-registry";
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
import { SessionAudit } from "../infrastructure/container-session";
import { ContainerProxyFieldChannel } from "../infrastructure/container-proxy/container-proxy-field-channel";
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
import { ContainerProxy } from "../infrastructure/container-proxy/container-proxy";
import { FieldPoller } from "../infrastructure/field-poller";
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

    // Tier-aware servisler
    containerProxy: asFunction(({ config, postgres, logger }) => {
      const tier = serviceTier(config);
      if (tier === "field") return new ContainerProxy(postgres, logger);
      return undefined;
    }).singleton(),

    // Faz 2 T2.3: FieldConnector — container tier + FIELD_CONNECT_ENABLED=true.
    // Bootstrap config fail-fast doğrulanır; kapalıysa kurulmaz (route "offline"
    // bildirir). Operational config register-ack/config-update ile canlı gelir.
    fieldConnector: asFunction(
      ({ config, postgres, realtime, logger }) => {
        const tier = serviceTier(config);
        const cfg = fieldConnectorConfig(config, tier);
        if (!cfg) return undefined;
        const snapshotSource = new RealtimeSnapshotSource(postgres, realtime);
        return new FieldConnector(
          cfg,
          new WsSocketClientFactory(),
          snapshotSource,
          new ReconnectDelay({
            baseMs: 1000,
            maxMs: 60000,
            jitterSpanMs: 1000,
            jitter: Math.random,
          }),
          logger,
        );
      },
    ).singleton(),

    // Faz 3 (container tier): konteyner oturum deposu + JWT üretici
    containerSessionStore: asFunction(
      ({ config, authCfg, fieldConnector }) => {
        const tier = serviceTier(config);
        if (tier !== "container" || !fieldConnector) return undefined;
        return new ContainerSessionStore(
          new JoseTokenSigner(authCfg.jwtSecret),
        );
      },
    ).singleton(),

    // Faz 3 (container tier): open-session/session-end frame'leri
    containerSessionServer: asFunction(
      ({ config, fieldConnector, containerSessionStore, logger }) => {
        const tier = serviceTier(config);
        if (!fieldConnector || !containerSessionStore) return undefined;
        void tier;
        return new ContainerSessionServer(
          fieldConnector,
          containerSessionStore,
          logger,
        );
      },
    ).singleton(),

    // Faz 3 (container tier): stream multiplex + çift upstream + WS köprüsü
    tunnelClient: asFunction(
      ({ config, fieldConnector }) => {
        const tier = serviceTier(config);
        if (tier !== "container" || !fieldConnector) return undefined;
        return TunnelClient.create({
          webServiceUrl: config.get<string>("tunnel.apiUpstream"),
          staticUrl: config.get<string>("tunnel.staticUpstream"),
        });
      },
    ).singleton(),

    // Faz 5.1 B2 (container tier): telemetry-query kontrol frame'lerini yanıtlar.
    // Field grafik sayfası tarihsel seriyi AYNI outbound WS kanalından ister —
    // konteynere inbound HTTP açılmaz (tasarım R4/R5).
    telemetryQueryResponder: asFunction(
      ({ config, fieldConnector, timescale, postgres, logger }) => {
        const tier = serviceTier(config);
        if (tier !== "container" || !fieldConnector) return undefined;
        const source = new TelemetrySeriesSource(
          new DeviceRegistry(postgres),
          timescale,
        );
        return new TelemetryQueryResponder(fieldConnector, source, logger);
      },
    ).singleton(),

    // Faz 3 (field tier): oturum yönetimi + tünel proxy
    fieldSessionStore: asFunction(({ config }) => {
      const tier = serviceTier(config);
      if (tier !== "field") return undefined;
      return new FieldSessionStore();
    }).singleton(),

    sessionAudit: asFunction(({ config, postgres, logger }) => {
      const tier = serviceTier(config);
      if (tier !== "field") return undefined;
      return new SessionAudit(postgres, logger);
    }).singleton(),

    sessionGateway: asFunction(
      ({ config, containerProxy, fieldSessionStore, sessionAudit, logger }) => {
        const tier = serviceTier(config);
        if (tier !== "field" || !containerProxy || !fieldSessionStore || !sessionAudit) {
          return undefined;
        }
        const channel = new ContainerProxyFieldChannel(containerProxy);
        return new ContainerSessionGateway(
          channel,
          fieldSessionStore,
          sessionAudit,
          logger,
        );
      },
    ).singleton(),

    tunnelProxy: asFunction(
      ({ config, containerProxy, fieldSessionStore, logger }) => {
        const tier = serviceTier(config);
        if (tier !== "field" || !containerProxy || !fieldSessionStore) {
          return undefined;
        }
        const channel = new ContainerProxyFieldChannel(containerProxy);
        return new TunnelProxy(channel, fieldSessionStore, logger);
      },
    ).singleton(),

    // Log altyapısı (TamperLogger — Faz 0 T0.5/T0.6).
    // asValue ile KAYDEDİLMEZ: awilix v11 async factory'leri await'lemez.
    // Logger, main()'de `buildTamperLogger` ile kurulur ve
    // `container.register({ logger: asValue(logger) })` ile enjekte edilir.

    requestContext: asFunction(() => new RequestContext()).singleton(),

    fieldPoller: asFunction(
      ({ postgres, config }) => {
        const tier = serviceTier(config);
        if (tier === "boss") return new FieldPoller(postgres);
        return undefined;
      },
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
      ({ userRepo, tokens, hasher, logger, loginThrottle }) =>
        new LoginUseCase(userRepo, tokens, hasher, logger, loginThrottle),
    ).singleton(),
    mfaLoginUseCase: asFunction(
      ({ userRepo, tokens, totp, logger, totpThrottle }) =>
        new MfaLoginUseCase(userRepo, tokens, totp, logger, totpThrottle),
    ).singleton(),
    mfaEnrollUseCase: asFunction(
      ({ userRepo, totp, tokens, logger, totpThrottle }) =>
        new MfaEnrollUseCase(userRepo, totp, tokens, logger, totpThrottle),
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

  return container;
}
