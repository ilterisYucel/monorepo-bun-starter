import type { Role } from "@gd-monorepo/shared-types";

export interface AuthConfig {
  jwtSecret: string;
  accessTokenExpirySeconds: number;
  refreshTokenExpirySeconds: number;
}

export function authConfig(): AuthConfig {
  return {
    jwtSecret: process.env.JWT_SECRET ?? "dev-secret-change-in-production",
    accessTokenExpirySeconds: 15 * 60,
    refreshTokenExpirySeconds: 7 * 24 * 60 * 60,
  };
}

export interface ServerConfig {
  port: number;
  host: string;
}

export function serverConfig(): ServerConfig {
  return {
    port: parseInt(process.env.PORT ?? "5001", 10),
    host: process.env.HOST ?? "0.0.0.0",
  };
}

export interface PostgresConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

export function postgresConfig(): PostgresConfig {
  return {
    host: process.env.POSTGRES_HOST ?? "localhost",
    port: parseInt(process.env.POSTGRES_PORT ?? "5432", 10),
    user: process.env.POSTGRES_USER ?? "postgres",
    password: process.env.POSTGRES_PASSWORD ?? "password",
    database: process.env.POSTGRES_DATABASE ?? "battery",
  };
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
      username: "guest",
      password: "guest123",
      role: "guest",
      name: "Misafir",
    },
  ];
}
