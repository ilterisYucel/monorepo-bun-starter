/**
 * Tum servisler tarafindan paylasilan ConfigDefinition listesi.
 *
 * Her servis kendi ihtiyaci olan tanimlari bu listeden secer.
 * Tanimlar env, config dosyasi ve varsayilan deger zincirini tanimlar.
 *
 * Oncelik zinciri: process.env > .env dosyasi > config dosyasi > varsayilan
 *
 * @example
 * // web-service icin:
 * const loader = new ConfigLoader(ALL_DEFINITIONS, [
 *   new EnvSource(),
 *   new JsonFileSource("./config/service.json"),
 * ]);
 */

import { validateOrThrow } from "@gd-monorepo/shared-types";
import {
  authConfigSchema,
  serverConfigSchema,
  redisConfigSchema,
  postgresConfigSchema,
} from "@gd-monorepo/shared-types";
import type { ConfigDefinition } from "./types";

// =============================================================================
// Sunucu
// =============================================================================

export const serverPort: ConfigDefinition<number> = {
  key: "server.port",
  env: "PORT",
  filePath: "server.port",
  default: 5001,
  validate: (v) =>
    validateOrThrow(serverConfigSchema.shape.port, Number(v), "server.port"),
  description: "Fastify HTTP sunucu portu",
};

export const serverHost: ConfigDefinition<string> = {
  key: "server.host",
  env: "HOST",
  filePath: "server.host",
  default: "0.0.0.0",
  validate: (v) =>
    validateOrThrow(serverConfigSchema.shape.host, String(v), "server.host"),
  description: "Fastify HTTP sunucu bind adresi",
};

// =============================================================================
// Auth (sadece web-service tarafindan kullanilir)
// =============================================================================

export const authJwtSecret: ConfigDefinition<string> = {
  key: "auth.jwtSecret",
  env: "JWT_SECRET",
  filePath: "auth.jwtSecret",
  default: "dev-secret-change-in-production",
  validate: (v) =>
    validateOrThrow(authConfigSchema.shape.jwtSecret, String(v), "auth.jwtSecret"),
  secret: true,
  restartOnChange: true,
  description: "JWT imzalama anahtari. En az 16 karakter.",
};

export const authAccessTokenExpirySeconds: ConfigDefinition<number> = {
  key: "auth.accessTokenExpirySeconds",
  env: "ACCESS_TOKEN_EXPIRY_SECONDS",
  filePath: "auth.accessTokenExpirySeconds",
  default: 15 * 60,
  validate: (v) =>
    validateOrThrow(authConfigSchema.shape.accessTokenExpirySeconds, Number(v), "auth.accessTokenExpirySeconds"),
  description: "Access token gecerlilik suresi (saniye). Varsayilan: 15 dakika.",
};

export const authRefreshTokenExpirySeconds: ConfigDefinition<number> = {
  key: "auth.refreshTokenExpirySeconds",
  env: "REFRESH_TOKEN_EXPIRY_SECONDS",
  filePath: "auth.refreshTokenExpirySeconds",
  default: 7 * 24 * 60 * 60,
  validate: (v) =>
    validateOrThrow(authConfigSchema.shape.refreshTokenExpirySeconds, Number(v), "auth.refreshTokenExpirySeconds"),
  description: "Refresh token gecerlilik suresi (saniye). Varsayilan: 7 gun.",
};

// =============================================================================
// Redis (tum servisler tarafindan kullanilir)
// =============================================================================

export const redisHost: ConfigDefinition<string> = {
  key: "redis.host",
  env: "REDIS_HOST",
  filePath: "redis.host",
  default: "127.0.0.1",
  validate: (v) =>
    validateOrThrow(redisConfigSchema.shape.host, String(v), "redis.host"),
  description: "Redis sunucu adresi",
};

export const redisPort: ConfigDefinition<number> = {
  key: "redis.port",
  env: "REDIS_PORT",
  filePath: "redis.port",
  default: 6379,
  validate: (v) =>
    validateOrThrow(redisConfigSchema.shape.port, Number(v), "redis.port"),
  description: "Redis sunucu portu",
};

export const redisPassword: ConfigDefinition<string | undefined> = {
  key: "redis.password",
  env: "REDIS_PASSWORD",
  filePath: "redis.password",
  default: undefined,
  secret: true,
  description: "Redis sifresi (istege bagli)",
};

export const redisDb: ConfigDefinition<number | undefined> = {
  key: "redis.db",
  env: "REDIS_DB",
  filePath: "redis.db",
  default: undefined,
  description: "Redis veritabani numarasi (istege bagli)",
};

// =============================================================================
// PostgreSQL — PostgresAdapter icin (users, devices, system_logs)
// =============================================================================

export const postgresHost: ConfigDefinition<string> = {
  key: "postgresql.host",
  env: "POSTGRES_HOST",
  filePath: "postgresql.host",
  default: "localhost",
  validate: (v) =>
    validateOrThrow(postgresConfigSchema.shape.host, String(v), "postgresql.host"),
  description: "PostgreSQL sunucu adresi",
};

export const postgresPort: ConfigDefinition<number> = {
  key: "postgresql.port",
  env: "POSTGRES_PORT",
  filePath: "postgresql.port",
  default: 5432,
  validate: (v) =>
    validateOrThrow(postgresConfigSchema.shape.port, Number(v), "postgresql.port"),
  description: "PostgreSQL sunucu portu",
};

export const postgresUser: ConfigDefinition<string> = {
  key: "postgresql.user",
  env: "POSTGRES_USER",
  filePath: "postgresql.user",
  default: "postgres",
  validate: (v) =>
    validateOrThrow(postgresConfigSchema.shape.user, String(v), "postgresql.user"),
  description: "PostgreSQL kullanici adi",
};

export const postgresPassword: ConfigDefinition<string> = {
  key: "postgresql.password",
  env: "POSTGRES_PASSWORD",
  filePath: "postgresql.password",
  default: "password",
  validate: (v) =>
    validateOrThrow(postgresConfigSchema.shape.password, String(v), "postgresql.password"),
  secret: true,
  description: "PostgreSQL sifresi",
};

export const postgresDatabase: ConfigDefinition<string> = {
  key: "postgresql.database",
  env: "POSTGRES_DATABASE",
  filePath: "postgresql.database",
  default: "battery",
  validate: (v) =>
    validateOrThrow(postgresConfigSchema.shape.database, String(v), "postgresql.database"),
  description: "PostgreSQL veritabani adi",
};

export const postgresPoolSize: ConfigDefinition<number | undefined> = {
  key: "postgresql.maxConnections",
  env: "POSTGRES_POOL_SIZE",
  filePath: "postgresql.maxConnections",
  default: undefined,
  description: "PostgreSQL baglanti havuzu boyutu (varsayilan: 3)",
};

// =============================================================================
// TimescaleDB — TimescaleDBAdapter icin (telemetri verisi)
// =============================================================================

export const timescaleHost: ConfigDefinition<string> = {
  key: "timescale.host",
  env: "TIMESCALE_HOST",
  filePath: "timescale.host",
  default: "localhost",
  validate: (v) =>
    validateOrThrow(postgresConfigSchema.shape.host, String(v), "timescale.host"),
  description: "TimescaleDB sunucu adresi",
};

export const timescalePort: ConfigDefinition<number> = {
  key: "timescale.port",
  env: "TIMESCALE_PORT",
  filePath: "timescale.port",
  default: 5432,
  validate: (v) =>
    validateOrThrow(postgresConfigSchema.shape.port, Number(v), "timescale.port"),
  description: "TimescaleDB sunucu portu",
};

export const timescaleUser: ConfigDefinition<string> = {
  key: "timescale.user",
  env: "TIMESCALE_USER",
  filePath: "timescale.user",
  default: "postgres",
  validate: (v) =>
    validateOrThrow(postgresConfigSchema.shape.user, String(v), "timescale.user"),
  description: "TimescaleDB kullanici adi",
};

export const timescalePassword: ConfigDefinition<string> = {
  key: "timescale.password",
  env: "TIMESCALE_PASSWORD",
  filePath: "timescale.password",
  default: "password",
  validate: (v) =>
    validateOrThrow(postgresConfigSchema.shape.password, String(v), "timescale.password"),
  secret: true,
  description: "TimescaleDB sifresi",
};

export const timescaleDatabase: ConfigDefinition<string> = {
  key: "timescale.database",
  env: "TIMESCALE_DATABASE",
  filePath: "timescale.database",
  default: "battery",
  validate: (v) =>
    validateOrThrow(postgresConfigSchema.shape.database, String(v), "timescale.database"),
  description: "TimescaleDB veritabani adi",
};

// =============================================================================
// TimescaleDB — optimizasyon ayarlari (STORAGE-ESTIMATE.md §3)
// =============================================================================

export const timescaleChunkInterval: ConfigDefinition<string> = {
  key: "timescale.chunkInterval",
  env: "TIMESCALE_CHUNK_INTERVAL",
  filePath: "timescale.chunkInterval",
  default: "6 hours",
  unit: "duration-pg",
  description: "Hypertable chunk zaman araligi. STORAGE-ESTIMATE §3.1",
};

export const timescaleCompressAfter: ConfigDefinition<string> = {
  key: "timescale.compressAfter",
  env: "TIMESCALE_COMPRESS_AFTER",
  filePath: "timescale.compressAfter",
  default: "1 day",
  unit: "duration-pg",
  description: "Sikistirma politikasi esik suresi. STORAGE-ESTIMATE §3.2",
};

export const timescaleRetentionAfter: ConfigDefinition<string> = {
  key: "timescale.retentionAfter",
  env: "TIMESCALE_RETENTION_AFTER",
  filePath: "timescale.retentionAfter",
  default: "90 days",
  unit: "duration-pg",
  description: "Retention politikasi esik suresi. STORAGE-ESTIMATE §3.3",
  onUpdate: (newVal, _oldVal) => {
    console.log(`[Config] timescale.retentionAfter guncellendi: ${newVal}`);
  },
};

export const timescaleStatementTimeoutMs: ConfigDefinition<number> = {
  key: "timescale.statementTimeoutMs",
  env: "TIMESCALE_STATEMENT_TIMEOUT_MS",
  filePath: "timescale.statementTimeoutMs",
  default: 60000,
  validate: (v) => {
    const num = Number(v);
    if (isNaN(num) || num <= 0) throw new Error(`Geçersiz statement timeout: ${v}`);
    return num;
  },
  description: "SQL sorgu timeout (milisaniye)",
};

export const timescaleIdleTimeoutMs: ConfigDefinition<number> = {
  key: "timescale.idleTimeoutMs",
  env: "TIMESCALE_IDLE_TIMEOUT_MS",
  filePath: "timescale.idleTimeoutMs",
  default: 30000,
  validate: (v) => {
    const num = Number(v);
    if (isNaN(num) || num <= 0) throw new Error(`Geçersiz idle timeout: ${v}`);
    return num;
  },
  description: "Bos baglanti timeout (milisaniye)",
};

export const timescaleConnectionTimeoutMs: ConfigDefinition<number> = {
  key: "timescale.connectionTimeoutMs",
  env: "TIMESCALE_CONNECTION_TIMEOUT_MS",
  filePath: "timescale.connectionTimeoutMs",
  default: 5000,
  validate: (v) => {
    const num = Number(v);
    if (isNaN(num) || num <= 0) throw new Error(`Geçersiz connection timeout: ${v}`);
    return num;
  },
  description: "Yeni baglanti timeout (milisaniye)",
};

export const timescalePoolSize: ConfigDefinition<number> = {
  key: "timescale.maxConnections",
  env: "TIMESCALE_POOL_SIZE",
  filePath: "timescale.maxConnections",
  default: 5,
  validate: (v) => {
    const num = Number(v);
    if (isNaN(num) || num <= 0) throw new Error(`Geçersiz pool size: ${v}`);
    return num;
  },
  description: "TimescaleDB baglanti havuzu boyutu",
};

// =============================================================================
// Servis (tier, config dizini, polling ayarlari)
// =============================================================================

export const serviceTier: ConfigDefinition<"container" | "field" | "boss"> = {
  key: "service.tier",
  env: "SERVICE_TIER",
  filePath: "service.tier",
  default: "container",
  validate: (v) => {
    const s = String(v).toLowerCase();
    if (s !== "container" && s !== "field" && s !== "boss") {
      throw new Error(`Gecersiz SERVICE_TIER: "${v}". Beklenen: container | field | boss`);
    }
    return s as "container" | "field" | "boss";
  },
  restartOnChange: true,
  description: "Servis seviyesi: container, field veya boss",
};

export const deviceConfigDir: ConfigDefinition<string> = {
  key: "device.configDir",
  env: "DEVICE_CONFIG_DIR",
  filePath: "device.configDir",
  default: "./config",
  description: "Cihaz konfigürasyon dosyalarinin bulundugu dizin",
};

export const servicePollIntervalMs: ConfigDefinition<number> = {
  key: "service.pollIntervalMs",
  env: "SERVICE_POLL_INTERVAL_MS",
  filePath: "service.servicePollIntervalMs",
  default: 5000,
  validate: (v) => {
    const num = Number(v);
    if (isNaN(num) || num < 100) throw new Error(`Gecersiz poll interval: ${v} (min 100ms)`);
    return num;
  },
  description: "Cihaz polling araligi (milisaniye). Device service icin global varsayilan.",
  onUpdate: (_newVal, _oldVal) => {
    console.log(`[Config] service.pollIntervalMs guncellendi. Yeni cihazlar bu degeri kullanacak.`);
  },
};

export const workerConcurrency: ConfigDefinition<number> = {
  key: "service.workerConcurrency",
  env: "WORKER_CONCURRENCY",
  filePath: "service.workerConcurrency",
  default: 5,
  validate: (v) => {
    const num = Number(v);
    if (isNaN(num) || num < 1) throw new Error(`Gecersiz concurrency: ${v}`);
    return num;
  },
  description: "BullMQ worker eszamanlilik limiti",
};

export const managementIntervalMs: ConfigDefinition<number> = {
  key: "service.managementIntervalMs",
  env: "MANAGEMENT_INTERVAL_MS",
  filePath: "service.managementIntervalMs",
  default: 10000,
  validate: (v) => {
    const num = Number(v);
    if (isNaN(num) || num < 1000) throw new Error(`Gecersiz management interval: ${v}`);
    return num;
  },
  description: "Yonetim islemleri periyodu (milisaniye)",
};

// =============================================================================
// Integration Service — plugin yukleme
// =============================================================================

export const integrationPluginDir: ConfigDefinition<string> = {
  key: "integration.pluginDir",
  env: "INTEGRATION_PLUGIN_DIR",
  filePath: "integration.pluginDir",
  default: "./plugins",
  description: "Runtime plugin dizini (musteriye ozel pluginler)",
};

export const integrationConfigDir: ConfigDefinition<string> = {
  key: "integration.configDir",
  env: "INTEGRATION_CONFIG_DIR",
  filePath: "integration.configDir",
  default: "./config/plugins",
  description: "Plugin konfigurasyon dizini (<plugin-adi>.json dosyalari)",
};

export const integrationStateDir: ConfigDefinition<string> = {
  key: "integration.stateDir",
  env: "INTEGRATION_STATE_DIR",
  filePath: "integration.stateDir",
  default: "./data/plugins",
  description: "Plugin durum dizini (fetch cursor vb.)",
};

// =============================================================================
// i18n / Çeviri
// =============================================================================

export const i18nDefaultLocale: ConfigDefinition<string> = {
  key: "i18n.defaultLocale",
  env: "I18N_DEFAULT_LOCALE",
  filePath: "i18n.defaultLocale",
  default: "tr",
  validate: (v) => {
    const s = String(v).toLowerCase();
    if (s.length < 2) throw new Error(`Geçersiz locale: "${v}"`);
    return s;
  },
  description: "Varsayılan dil kodu (tr, en, de, ...)",
};

export const i18nAvailableLocales: ConfigDefinition<string> = {
  key: "i18n.availableLocales",
  env: "I18N_AVAILABLE_LOCALES",
  filePath: "i18n.availableLocales",
  default: "tr,en",
  description: "Kullanılabilir diller (virgülle ayrılmış)",
};

// =============================================================================
// Toplu liste — tum servisler icin
// =============================================================================

/**
 * Tum ConfigDefinition'lari iceren liste.
 * Her servis bu listenin tamamini veya bir kismini kullanabilir.
 *
 * ELEGANT-EXCEPTION: heterojen listedir — T tip parametresi her girdide farklidir.
 * `ConfigDefinition<any>[]` varyans denetimini devre disi birakir; degerler
 * ConfigLoader icinde her key icin ayri ayri dogrulanir.
 */
export const ALL_CONFIG_DEFINITIONS: ConfigDefinition<any>[] = [
  // Sunucu
  serverPort,
  serverHost,

  // Auth
  authJwtSecret,
  authAccessTokenExpirySeconds,
  authRefreshTokenExpirySeconds,

  // Redis
  redisHost,
  redisPort,
  redisPassword,
  redisDb,

  // PostgreSQL
  postgresHost,
  postgresPort,
  postgresUser,
  postgresPassword,
  postgresDatabase,
  postgresPoolSize,

  // TimescaleDB
  timescaleHost,
  timescalePort,
  timescaleUser,
  timescalePassword,
  timescaleDatabase,
  timescaleChunkInterval,
  timescaleCompressAfter,
  timescaleRetentionAfter,
  timescaleStatementTimeoutMs,
  timescaleIdleTimeoutMs,
  timescaleConnectionTimeoutMs,
  timescalePoolSize,

  // Servis
  serviceTier,
  deviceConfigDir,
  servicePollIntervalMs,
  workerConcurrency,
  managementIntervalMs,

  // Integration Service
  integrationPluginDir,
  integrationConfigDir,
  integrationStateDir,

  // i18n
  i18nDefaultLocale,
  i18nAvailableLocales,
];
