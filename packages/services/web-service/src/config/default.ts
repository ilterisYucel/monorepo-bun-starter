import type { Role, PostgresConfig } from "@gd-monorepo/shared-types";
import { ConfigLoader, EnvSource, ALL_CONFIG_DEFINITIONS } from "@gd-monorepo/shared-utils";
import type { TimescaleDBConfig } from "@gd-monorepo/core";

export type { PostgresConfig };

// =============================================================================
// Tip tanimlari (public API — container.ts tarafindan tuketilir)
// =============================================================================

export interface AuthConfig {
  jwtSecret: string;
  accessTokenExpirySeconds: number;
  refreshTokenExpirySeconds: number;
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
  return {
    jwtSecret: loader.get<string>("auth.jwtSecret"),
    accessTokenExpirySeconds: loader.get<number>("auth.accessTokenExpirySeconds"),
    refreshTokenExpirySeconds: loader.get<number>("auth.refreshTokenExpirySeconds"),
  };
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
  return [
    {
      username: "admin",
      password: "admin123",
      role: "admin",
      name: "Admin Kullanici",
    },
    {
      username: "boss",
      password: "boss123",
      role: "boss",
      name: "Yonetici",
    },
    {
      username: "guest",
      password: "guest123",
      role: "guest",
      name: "Misafir",
    },
  ];
}
