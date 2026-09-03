import { describe, it, expect } from "vitest";
import { ConfigLoader, EnvSource } from "../index";
import {
  ALL_CONFIG_DEFINITIONS,
  logLevel,
  logSigningKeyPath,
  logFilePath,
  serviceTier,
} from "./definitions";

/**
 * Faz 0 — shared-utils config definitions kontratı (T0.5/T0.6):
 * - Log tanımları ConfigLoader'dan tip güvenli okunur.
 * - `log.level` yalnızca 5 seviyeyi kabul eder; geçersiz değer fırlatır.
 * - `log.signingKeyPath` varsayılanı doludur; env ile ezilebilir.
 * - `log.filePath` varsayılanı undefined — tier varsayılanına düşer.
 */

describe("log config definitions (T0.5/T0.6)", () => {
  it("logLevel varsayılanı info'dur", () => {
    const loader = new ConfigLoader(ALL_CONFIG_DEFINITIONS, [new EnvSource()]);
    loader.load();
    expect(loader.get<string>("log.level")).toBe("info");
  });

  it("logLevel env ile okunur", () => {
    process.env.LOG_LEVEL = "error";
    try {
      const loader = new ConfigLoader(ALL_CONFIG_DEFINITIONS, [
        new EnvSource(),
      ]);
      loader.load();
      expect(loader.get<string>("log.level")).toBe("error");
    } finally {
      delete process.env.LOG_LEVEL;
    }
  });

  it("logLevel geçersiz değerde fırlatır", () => {
    expect(() => logLevel.validate?.("verbose")).toThrow();
  });

  it("logSigningKeyPath varsayılanı doludur", () => {
    expect(logSigningKeyPath.default).toBe("/etc/gd-pms/log-signing.key");
  });

  it("logFilePath varsayılanı undefined — tier varsayılanına düşer", () => {
    expect(logFilePath.default).toBeUndefined();
  });

  it("serviceTier geçersiz değerde fırlatır", () => {
    expect(() => serviceTier.validate?.("edge")).toThrow();
    expect(serviceTier.validate?.("FIELD")).toBe("field");
  });

  it("tüm tanımlar benzersiz anahtara sahiptir", () => {
    const keys = ALL_CONFIG_DEFINITIONS.map((d) => d.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
