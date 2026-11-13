import { describe, it, expect } from "vitest";
import { ConfigLoader, EnvSource } from "../index";
import {
  ALL_CONFIG_DEFINITIONS,
  logLevel,
  logSigningKeyPath,
  logFilePath,
  serviceTier,
} from "./definitions";

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
    expect(serviceTier.validate?.("SITE")).toBe("site");
    expect(() => serviceTier.validate?.("field")).toThrow();
  });

  it("tüm tanımlar benzersiz anahtara sahiptir", () => {
    const keys = ALL_CONFIG_DEFINITIONS.map((d) => d.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("bmsTarget tanımları kaldırıldı (simülatör-only config — SPEC K1/K2)", () => {
    for (const key of ["device.bmsTargetHost", "device.bmsTargetPort", "device.pcsPowerHost"]) {
      expect(ALL_CONFIG_DEFINITIONS.some((d) => d.key === key)).toBe(false);
    }
  });
});
