import type { Role, PostgresConfig } from "@gd-monorepo/shared-types";
import {
  validateOrThrow,
  authConfigSchema,
  serverConfigSchema,
  postgresConfigSchema,
} from "@gd-monorepo/shared-types";

export type { PostgresConfig };

export interface AuthConfig {
  jwtSecret: string;
  accessTokenExpirySeconds: number;
  refreshTokenExpirySeconds: number;
}

export function authConfig(): AuthConfig {
  return validateOrThrow<AuthConfig>(
    authConfigSchema,
    {
      jwtSecret: process.env.JWT_SECRET ?? "dev-secret-change-in-production",
      accessTokenExpirySeconds: 15 * 60,
      refreshTokenExpirySeconds: 7 * 24 * 60 * 60,
    },
    "authConfig",
  );
}

export interface ServerConfig {
  port: number;
  host: string;
}

export type ServiceTier = "container" | "field" | "boss";

export function serviceTier(): ServiceTier {
  const tier = process.env.SERVICE_TIER ?? "container";
  if (tier !== "container" && tier !== "field" && tier !== "boss") {
    throw new Error(`Gecersiz SERVICE_TIER: ${tier}`);
  }
  return tier;
}

const DEFAULT_PORTS: Record<ServiceTier, number> = {
  container: 5001,
  field: 5002,
  boss: 5003,
};

export function serverConfig(): ServerConfig {
  const tier = serviceTier();
  return validateOrThrow<ServerConfig>(
    serverConfigSchema,
    {
      port: Number.parseInt(process.env.PORT ?? String(DEFAULT_PORTS[tier]), 10),
      host: process.env.HOST ?? "0.0.0.0",
    },
    "serverConfig",
  );
}

export function postgresConfig(): PostgresConfig {
  return validateOrThrow<PostgresConfig>(
    postgresConfigSchema,
    {
      host: process.env.POSTGRES_HOST ?? "localhost",
      port: Number.parseInt(process.env.POSTGRES_PORT ?? "5432", 10),
      user: process.env.POSTGRES_USER ?? "postgres",
      password: process.env.POSTGRES_PASSWORD ?? "password",
      database: process.env.POSTGRES_DATABASE ?? "battery",
    },
    "postgresConfig",
  );
}

export interface SeedUser {
  username: string;
  password: string;
  role: Role;
  name: string;
}

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

export function deviceConfigDir(): string {
  return process.env.DEVICE_CONFIG_DIR ?? "../device-service/config";
}
