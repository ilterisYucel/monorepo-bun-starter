import { describe, it, expect } from "vitest";
import { serverConfigSchema, authConfigSchema } from "./server-config";

describe("authConfigSchema", () => {
  it("accepts valid config", () => {
    const r = authConfigSchema.safeParse({
      jwtSecret: "super-secret-key-with-16-chars",
      accessTokenExpirySeconds: 900,
      refreshTokenExpirySeconds: 86400,
    });
    expect(r.success).toBe(true);
  });

  it("rejects short jwtSecret (< 16 chars)", () => {
    const r = authConfigSchema.safeParse({
      jwtSecret: "short",
      accessTokenExpirySeconds: 900,
      refreshTokenExpirySeconds: 86400,
    });
    expect(r.success).toBe(false);
  });

  it("rejects zero accessTokenExpirySeconds", () => {
    const r = authConfigSchema.safeParse({
      jwtSecret: "a-very-long-secret-key-for-testing",
      accessTokenExpirySeconds: 0,
      refreshTokenExpirySeconds: 86400,
    });
    expect(r.success).toBe(false);
  });

  it("rejects negative refreshTokenExpirySeconds", () => {
    const r = authConfigSchema.safeParse({
      jwtSecret: "a-very-long-secret-key-for-testing",
      accessTokenExpirySeconds: 900,
      refreshTokenExpirySeconds: -1,
    });
    expect(r.success).toBe(false);
  });

  it("rejects non-integer expiry", () => {
    const r = authConfigSchema.safeParse({
      jwtSecret: "a-very-long-secret-key-for-testing",
      accessTokenExpirySeconds: 900.5,
      refreshTokenExpirySeconds: 86400,
    });
    expect(r.success).toBe(false);
  });

  it("accepts exactly 16 char jwtSecret", () => {
    const r = authConfigSchema.safeParse({
      jwtSecret: "1234567890123456",
      accessTokenExpirySeconds: 900,
      refreshTokenExpirySeconds: 86400,
    });
    expect(r.success).toBe(true);
  });
});

describe("serverConfigSchema", () => {
  it("accepts valid config", () => {
    const r = serverConfigSchema.safeParse({ host: "0.0.0.0", port: 5001 });
    expect(r.success).toBe(true);
  });

  it("rejects empty host", () => {
    const r = serverConfigSchema.safeParse({ host: "", port: 5001 });
    expect(r.success).toBe(false);
  });

  it("rejects port 0", () => {
    const r = serverConfigSchema.safeParse({ host: "localhost", port: 0 });
    expect(r.success).toBe(false);
  });

  it("rejects port > 65535", () => {
    const r = serverConfigSchema.safeParse({ host: "localhost", port: 99999 });
    expect(r.success).toBe(false);
  });

  it("rejects negative port", () => {
    const r = serverConfigSchema.safeParse({ host: "localhost", port: -5 });
    expect(r.success).toBe(false);
  });
});
