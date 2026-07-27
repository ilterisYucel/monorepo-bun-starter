import { describe, it, expect } from "vitest";
import {
  redisConfigSchema,
  postgresConfigSchema,
  serviceConfigFileSchema,
} from "./service-config";

describe("redisConfigSchema", () => {
  it("accepts minimal config", () => {
    const r = redisConfigSchema.safeParse({ host: "localhost", port: 6379 });
    expect(r.success).toBe(true);
  });

  it("accepts full config", () => {
    const r = redisConfigSchema.safeParse({
      host: "redis.example.com",
      port: 6380,
      password: "secret",
      db: 1,
    });
    expect(r.success).toBe(true);
  });

  it("rejects empty host", () => {
    const r = redisConfigSchema.safeParse({ host: "", port: 6379 });
    expect(r.success).toBe(false);
  });

  it("rejects port 0", () => {
    const r = redisConfigSchema.safeParse({ host: "x", port: 0 });
    expect(r.success).toBe(false);
  });

  it("rejects port > 65535", () => {
    const r = redisConfigSchema.safeParse({ host: "x", port: 65536 });
    expect(r.success).toBe(false);
  });

  it("rejects negative db index", () => {
    const r = redisConfigSchema.safeParse({
      host: "x",
      port: 6379,
      db: -1,
    });
    expect(r.success).toBe(false);
  });
});

describe("postgresConfigSchema", () => {
  const valid = {
    host: "localhost",
    port: 5432,
    user: "admin",
    password: "pass",
    database: "mydb",
  };

  it("accepts valid config", () => {
    expect(() => postgresConfigSchema.parse(valid)).not.toThrow();
  });

  it("accepts with optional ssl and maxConnections", () => {
    const r = postgresConfigSchema.safeParse({
      ...valid,
      ssl: true,
      maxConnections: 10,
    });
    expect(r.success).toBe(true);
  });

  it("rejects empty database", () => {
    const r = postgresConfigSchema.safeParse({ ...valid, database: "" });
    expect(r.success).toBe(false);
  });

  it("rejects empty password", () => {
    const r = postgresConfigSchema.safeParse({ ...valid, password: "" });
    expect(r.success).toBe(false);
  });

  it("rejects zero maxConnections", () => {
    const r = postgresConfigSchema.safeParse({
      ...valid,
      maxConnections: 0,
    });
    expect(r.success).toBe(false);
  });
});

describe("serviceConfigFileSchema", () => {
  it("accepts minimal config", () => {
    const r = serviceConfigFileSchema.safeParse({
      redis: { host: "localhost", port: 6379 },
    });
    expect(r.success).toBe(true);
  });

  it("accepts full config with optional sections", () => {
    const r = serviceConfigFileSchema.safeParse({
      redis: { host: "localhost", port: 6379 },
      postgresql: {
        host: "pg",
        port: 5432,
        user: "app",
        password: "secret",
        database: "mydb",
      },
      servicePollIntervalMs: 1000,
      workerConcurrency: 5,
      managementIntervalMs: 30000,
    });
    expect(r.success).toBe(true);
  });

  it("rejects missing redis", () => {
    const r = serviceConfigFileSchema.safeParse({});
    expect(r.success).toBe(false);
  });

  it("rejects invalid redis config", () => {
    const r = serviceConfigFileSchema.safeParse({
      redis: { host: "", port: 0 },
    });
    expect(r.success).toBe(false);
  });
});
