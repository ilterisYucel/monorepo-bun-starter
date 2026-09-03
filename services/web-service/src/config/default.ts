import type { Role, PostgresConfig } from "@gd-monorepo/shared-types";
import type { LogLevel } from "@gd-monorepo/tamper-logger";

import { DEFAULT_FIELD_OPERATIONAL_CONFIG } from "@gd-monorepo/ws-tunnel";

import { ConfigLoader, EnvSource, ALL_CONFIG_DEFINITIONS } from "@gd-monorepo/shared-utils";
import { loggerConfigForTier } from "@gd-monorepo/platform-logging";
import type { LoggerConfig } from "@gd-monorepo/platform-logging";
import type { TimescaleDBConfig } from "@gd-monorepo/core";

import type { FieldConnectorConfig } from "@gd-monorepo/ws-tunnel";
import type { SiteFieldConfig } from "../infrastructure/persistence/site-field-seed";

export type { PostgresConfig };

// =============================================================================
// Tip tanimlari (public API — container.ts tarafindan tuketilir)
// =============================================================================

export interface AuthConfig {
  jwtSecret: string;
  accessTokenExpirySeconds: number;
  refreshTokenExpirySeconds: number;
  /** Faz 6 T6.1 — MFA giriş ara-adım token TTL'si (sn). */
  mfaTokenExpirySeconds: number;
  /** Faz 6 T6.1 — MFA kaydı zorunlu roller (container tier'da boş). */
  mfaRequiredRoles: Role[];
  /** Faz 6 T6.6 — kilit eşiği (başarısız giriş sayısı). */
  loginMaxFailures: number;
  /** Faz 6 T6.6 — sayaç penceresi (sn). */
  loginWindowSeconds: number;
  /** Faz 6 T6.6 — kilit süresi (sn). */
  loginLockSeconds: number;
  /** 2026-08-30 T1.6 — TOTP deneme kilit eşiği (ASVS V3.5.2). */
  totpMaxFailures: number;
  /** 2026-08-30 T1.6 — TOTP sayaç penceresi (sn). */
  totpWindowSeconds: number;
  /** 2026-08-30 T1.6 — TOTP kilit süresi (sn). */
  totpLockSeconds: number;
}

export interface ServerConfig {
  port: number;
  host: string;
}

export type ServiceTier = "container" | "field" | "boss";

export interface SeedUser {
  username: string;
  password: string;
  role: Role;
  name: string;
  /** İlk girişte zorunlu şifre değişimi (Faz 1 T1.6). */
  mustChangePassword?: boolean;
}

// =============================================================================
// ConfigLoader olusturma (tek instance, tum fonksiyonlar tarafindan paylasilir)
// =============================================================================

/**
 * Web-service icin ConfigLoader olusturur ve yukler.
 * Bu fonksiyon sadece bir kez cagrilmali, sonuc container'a kaydedilmelidir.
 *
 * Oncelik zinciri: process.env > config dosyasi > varsayilan
 */
export function createConfigLoader(): ConfigLoader {
  const loader = new ConfigLoader(ALL_CONFIG_DEFINITIONS, [
    new EnvSource(),
  ]);
  loader.load();
  console.log("[Config] Konfigürasyon yuklendi:", loader.redacted());
  return loader;
}

// =============================================================================
// ConfigLoader'dan tip-guvenli config cikarici fonksiyonlar
// =============================================================================

export function authConfig(loader: ConfigLoader): AuthConfig {
  const jwtSecret = loader.get<string>("auth.jwtSecret");
  const tier = serviceTier(loader);
  // Faz 1 T1.6: field/boss tier'da dev/default secret ile çalışmak YASAK —
  // açılış fail-fast reddedilir.
  if (
    (tier === "field" || tier === "boss") &&
    (jwtSecret === "dev-secret-change-in-production" || jwtSecret.length < 32)
  ) {
    throw new Error(
      "[Config] JWT_SECRET field/boss tier'da zorunludur — en az 32 karakterli, dev disi bir deger gerekli",
    );
  }
  return {
    jwtSecret,
    accessTokenExpirySeconds: loader.get<number>("auth.accessTokenExpirySeconds"),
    refreshTokenExpirySeconds: loader.get<number>("auth.refreshTokenExpirySeconds"),
    mfaTokenExpirySeconds: loader.get<number>("auth.mfaTokenExpirySeconds"),
    // Faz 6 T6.1: MFA zorunluluğu field/boss tier'da (uzak erişim).
    // Konteyner tier yerel UI'dır — zorunluluk kapalı (rollere bağlı MFA
    // konteyner kullanıcısını saha ziyareti olmadan kilitleyebilirdi).
    // MFA_ENABLED=false → enforcement tamamen kapanır (debug/geçici kurulum).
    mfaRequiredRoles: mfaRequiredRoles(loader, tier),
    loginMaxFailures: loader.get<number>("auth.loginMaxFailures"),
    loginWindowSeconds: loader.get<number>("auth.loginWindowSeconds"),
    loginLockSeconds: loader.get<number>("auth.loginLockSeconds"),
    totpMaxFailures: loader.get<number>("auth.totpMaxFailures"),
    totpWindowSeconds: loader.get<number>("auth.totpWindowSeconds"),
    totpLockSeconds: loader.get<number>("auth.totpLockSeconds"),
  };
}

/** Faz 6 T6.1 — "admin,teknik" → rol listesi; boş/girdi → []. */
export function parseMfaRequiredRoles(value: string): Role[] {
  const allowed: Role[] = ["admin", "teknik", "guest", "boss", "developer"];
  const parts = value
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
  const roles = parts.filter((part): part is Role =>
    allowed.includes(part as Role),
  );
  return [...new Set(roles)];
}

/**
 * Faz 6 T6.1 + 2026-08-28 debug flag'i — etkin MFA zorunlu roller:
 * - container tier: her zaman [] (yerel UI).
 * - field/boss tier: `MFA_ENABLED=false` ise [] (debug/geçici kurulum);
 *   aksi halde `AUTH_MFA_REQUIRED_ROLES` listesi (varsayılan admin,teknik).
 */
export function mfaRequiredRoles(
  loader: ConfigLoader,
  tier: ServiceTier,
): Role[] {
  if (tier === "container") return [];
  if (loader.get<boolean>("auth.mfaEnabled") === false) return [];
  return parseMfaRequiredRoles(loader.get<string>("auth.mfaRequiredRoles"));
}

export function serviceTier(loader: ConfigLoader): ServiceTier {
  return loader.get<ServiceTier>("service.tier");
}

export function serverConfig(loader: ConfigLoader): ServerConfig {
  return {
    port: loader.get<number>("server.port"),
    host: loader.get<string>("server.host"),
  };
}

/**
 * PostgresAdapter icin PostgreSQL baglanti konfigürasyonu.
 * users, devices, system_logs tablolari bu adapter uzerinden yonetilir.
 */
export function postgresConfig(loader: ConfigLoader): PostgresConfig {
  return {
    host: loader.get<string>("postgresql.host"),
    port: loader.get<number>("postgresql.port"),
    user: loader.get<string>("postgresql.user"),
    password: loader.get<string>("postgresql.password"),
    database: loader.get<string>("postgresql.database"),
    maxConnections: loader.get<number | undefined>("postgresql.maxConnections"),
  };
}

/**
 * TimescaleDBAdapter icin TimescaleDB konfigürasyonu.
 * Telemetri verisi bu adapter uzerinden yonetilir.
 *
 * Eger TIMESCALE_HOST env degiskeni set edilmemisse,
 * PostgreSQL baglanti bilgilerini kullanir (fallback).
 * Bu sayede ayni veritabani sunucusu hem PG hem TimescaleDB icin kullanilabilir.
 */
export function timescaleDBConfig(loader: ConfigLoader): TimescaleDBConfig {
  const tsHostSet = typeof process.env.TIMESCALE_HOST === "string";

  // Fallback: TIMESCALE_* set edilmemisse POSTGRES_* kullan
  const pg = postgresConfig(loader);

  return {
    host: tsHostSet ? loader.get<string>("timescale.host") : pg.host,
    port: tsHostSet ? loader.get<number>("timescale.port") : pg.port,
    user: tsHostSet ? loader.get<string>("timescale.user") : pg.user,
    password: tsHostSet ? loader.get<string>("timescale.password") : pg.password,
    database: tsHostSet ? loader.get<string>("timescale.database") : pg.database,
    maxConnections:
      tsHostSet
        ? loader.get<number>("timescale.maxConnections")
        : (pg.maxConnections ?? 5),
    chunkInterval: loader.get<string>("timescale.chunkInterval"),
    compressAfter: loader.get<string>("timescale.compressAfter"),
    retentionAfter: loader.get<string>("timescale.retentionAfter"),
    statementTimeoutMs: loader.get<number>("timescale.statementTimeoutMs"),
    idleTimeoutMs: loader.get<number>("timescale.idleTimeoutMs"),
    connectionTimeoutMs: loader.get<number>("timescale.connectionTimeoutMs"),
  };
}

export function deviceConfigDir(loader: ConfigLoader): string {
  return loader.get<string>("device.configDir");
}

// FieldConnector zaman sabitleri — bootstrap env'de TASINMAZ (tasarım §6.1:
// runtime değerleri build-time gömülmez); operational config ile canlı değişir.
const REGISTER_TIMEOUT_MS = 10000;
const LIVENESS_TIMEOUT_MS = 60000;

/**
 * FieldConnector bootstrap config (tasarım §6.1, T2.3):
 * - Kapalıysa undefined döner (FieldConnector awilix'te kurulmaz).
 * - Etkinse FIELD_WS_URL (virgüllü liste), CONTAINER_TOKEN ve CONTAINER_ID
 *   zorunludur — eksikse fail-fast fırlatır (yanlış yapılandırma sessizce
 *   "bağlı değil" görünmesin).
 * - Yalnızca container tier'da geçerlidir; başka tier'da etkin = hata.
 */
export function fieldConnectorConfig(
  loader: ConfigLoader,
  tier: ServiceTier,
): FieldConnectorConfig | undefined {
  const enabled = loader.get<boolean>("fieldConnect.enabled");
  if (!enabled) return undefined;

  if (tier !== "container") {
    throw new Error(
      "[Config] FIELD_CONNECT_ENABLED yalnizca container tier'da gecerlidir",
    );
  }

  const wsUrlRaw = loader.get<string | undefined>("fieldConnect.wsUrl");
  const token = loader.get<string | undefined>("fieldConnect.token");
  const containerId = loader.get<string | undefined>("site.containerId");
  if (!wsUrlRaw || !token || !containerId) {
    throw new Error(
      "[Config] FIELD_CONNECT_ENABLED=true iken FIELD_WS_URL, CONTAINER_TOKEN ve CONTAINER_ID zorunludur",
    );
  }

  const wsUrls = wsUrlRaw
    .split(",")
    .map((url) => url.trim())
    .filter((url) => url.length > 0);
  if (wsUrls.length === 0) {
    throw new Error("[Config] FIELD_WS_URL bos olamaz");
  }
  for (const url of wsUrls) {
    if (!url.startsWith("ws://") && !url.startsWith("wss://")) {
      throw new Error(
        `[Config] Gecersiz FIELD_WS_URL adresi: ${url} (ws:// veya wss:// olmali)`,
      );
    }
  }

  return {
    wsUrls,
    token,
    containerId,
    heartbeatIntervalMs: DEFAULT_FIELD_OPERATIONAL_CONFIG.heartbeatIntervalMs,
    telemetryIntervalMs: DEFAULT_FIELD_OPERATIONAL_CONFIG.telemetryIntervalMs,
    registerTimeoutMs: REGISTER_TIMEOUT_MS,
    livenessTimeoutMs: LIVENESS_TIMEOUT_MS,
  };
}

/**
 * Site kimliği (2026-08-28 — env'den saha):
 * - field tier: FIELD_ID zorunludur ve geçerli UUID olmalıdır (fail-fast).
 *   Tek saha modeli: saha satırı açılışta ensureSiteField ile seed edilir,
 *   elle `POST /api/fields` gerekmez.
 * - container/boss tier: undefined döner (boss'ta çok saha ileride — fieldId
 *   DB'den gelir).
 * - FIELD_NAME opsiyonel; yoksa varsayılan "Saha".
 */
export function siteFieldConfig(
  loader: ConfigLoader,
  tier: ServiceTier,
): SiteFieldConfig | undefined {
  if (tier !== "field") return undefined;

  const fieldId = loader.get<string | undefined>("site.fieldId");
  if (!fieldId) {
    throw new Error(
      "[Config] FIELD_ID field tier'da zorunludur (UUID — openssl rand yerine uuidgen)",
    );
  }
  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidPattern.test(fieldId)) {
    throw new Error(`[Config] Gecersiz FIELD_ID: "${fieldId}" (UUID olmali)`);
  }

  const fieldName =
    typeof process.env.FIELD_NAME === "string" && process.env.FIELD_NAME.length > 0
      ? process.env.FIELD_NAME
      : "Saha";
  return { fieldId, fieldName };
}

/**
 * TamperLogger operational config — tier varsayılanı + ConfigLoader override'ları.
 * LOG_LEVEL / LOG_SIGNING_KEY_PATH / LOG_FILE_PATH env değişkenleriyle ezilebilir.
 * Faz 6 T6.2/T6.7: LOG_EXTRA_SINKS ile syslog/webhook/smtp/sms eklenebilir.
 */
export function logConfig(loader: ConfigLoader): LoggerConfig {
  const base = loggerConfigForTier(serviceTier(loader), undefined);
  const extra = loader
    .get<string>("log.extraSinks")
    .split(",")
    .map((kind) => kind.trim())
    .filter((kind) => kind.length > 0) as LoggerConfig["sinks"];
  const overrides: Partial<LoggerConfig> = {
    level: loader.get<LogLevel>("log.level"),
    signingKeyPath: loader.get<string>("log.signingKeyPath"),
    sinks: [...base.sinks, ...extra],
  };
  const filePath = loader.get<string | undefined>("log.filePath");
  if (filePath !== undefined) {
    overrides.filePath = filePath;
  }
  return loggerConfigForTier(serviceTier(loader), overrides);
}

/** Faz 6 T6.2/T6.7 — SIEM/bildirim sink yapılandırmaları (yoksa undefined). */
export interface AlertSinkConfigs {
  syslog?: { protocol: "udp" | "tcp"; host: string; port: number };
  webhook?: { url: string; secret?: string };
  smtp?: {
    host: string;
    port: number;
    user: string;
    pass: string;
    from: string;
    to: string[];
  };
  sms?: {
    url: string;
    phones: string[];
    bodyTemplate: string;
  };
}

export function alertSinkConfigs(loader: ConfigLoader): AlertSinkConfigs {
  const configs: AlertSinkConfigs = {};
  const syslogHost = loader.get<string>("log.syslogHost");
  if (syslogHost.length > 0) {
    configs.syslog = {
      protocol: loader.get<"udp" | "tcp">("log.syslogProtocol"),
      host: syslogHost,
      port: loader.get<number>("log.syslogPort"),
    };
  }
  const webhookUrl = loader.get<string>("log.webhookUrl");
  if (webhookUrl.length > 0) {
    const secret = loader.get<string>("log.webhookSecret");
    configs.webhook = { url: webhookUrl, ...(secret ? { secret } : {}) };
  }
  const smtpHost = loader.get<string>("log.smtpHost");
  const smtpTo = loader
    .get<string>("log.smtpTo")
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
  if (smtpHost.length > 0 && smtpTo.length > 0) {
    configs.smtp = {
      host: smtpHost,
      port: loader.get<number>("log.smtpPort"),
      user: loader.get<string>("log.smtpUser"),
      pass: loader.get<string>("log.smtpPass"),
      from: loader.get<string>("log.smtpFrom"),
      to: smtpTo,
    };
  }
  const smsUrl = loader.get<string>("log.smsUrl");
  const smsPhones = loader
    .get<string>("log.smsPhones")
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
  if (smsUrl.length > 0 && smsPhones.length > 0) {
    configs.sms = {
      url: smsUrl,
      phones: smsPhones,
      bodyTemplate: loader.get<string>("log.smsTemplate"),
    };
  }
  return configs;
}

/**
 * RedisConnection icin Redis baglanti konfigürasyonu.
 * BullMQ ve RealtimeManager bu baglanti uzerinden calisir.
 */
export function redisConfig(loader: ConfigLoader): {
  host: string;
  port: number;
  password?: string;
  db?: number;
} {
  return {
    host: loader.get<string>("redis.host"),
    port: loader.get<number>("redis.port"),
    password: loader.get<string | undefined>("redis.password"),
    db: loader.get<number | undefined>("redis.db"),
  };
}

// =============================================================================
// Statik degerler (ConfigLoader gerektirmez)
// =============================================================================

export function seedUsers(): SeedUser[] {
  const tier = String(process.env.SERVICE_TIER ?? "container").toLowerCase();
  const productionTier = tier === "field" || tier === "boss";

  // Faz 1 T1.6: field/boss tier'da seed şifreleri env'den zorunludur;
  // eksikse açılış fail-fast reddedilir. Container tier dev default'ları korur.
  const resolveSeedPassword = (envName: string, devDefault: string): string => {
    const value = process.env[envName];
    if (value !== undefined && value.length >= 8) return value;
    if (productionTier) {
      throw new Error(
        `[Config] ${envName} field/boss tier'da zorunludur — en az 8 karakter`,
      );
    }
    return devDefault;
  };

  return [
    {
      username: "admin",
      password: resolveSeedPassword("SEED_ADMIN_PASSWORD", "admin123"),
      role: "admin",
      name: "Admin Kullanici",
      mustChangePassword: true,
    },
    {
      username: "boss",
      password: resolveSeedPassword("SEED_BOSS_PASSWORD", "boss123"),
      role: "boss",
      name: "Yonetici",
      mustChangePassword: true,
    },
    {
      username: "guest",
      password: resolveSeedPassword("SEED_GUEST_PASSWORD", "guest123"),
      role: "guest",
      name: "Misafir",
      // 2026-08-30: guest OTOMATİK giriş yapar (token yoksa/çıkışta) — zorunlu
      // şifre değişimi guest için uygulanmaz (guard + rbac istisnası).
      mustChangePassword: false,
    },
  ];
}
