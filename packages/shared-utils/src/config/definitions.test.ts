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
    expect(serviceTier.validate?.("FIELD")).toBe("field");
  });

  it("tüm tanımlar benzersiz anahtara sahiptir", () => {
    const keys = ALL_CONFIG_DEFINITIONS.map((d) => d.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("bmsTarget tanımları: varsayılan undefined; env ile okunur; port sayıya dönüşür", () => {
    process.env.PCS_BMS_TARGET_HOST = "field-device-service";
    process.env.PCS_BMS_TARGET_PORT = "15502";
    try {
      const loader = new ConfigLoader(ALL_CONFIG_DEFINITIONS, [
        new EnvSource(),
      ]);
      loader.load();
      expect(loader.get<string | undefined>("device.bmsTargetHost")).toBe(
        "field-device-service",
      );
      expect(loader.get<number | undefined>("device.bmsTargetPort")).toBe(15502);
    } finally {
      delete process.env.PCS_BMS_TARGET_HOST;
      delete process.env.PCS_BMS_TARGET_PORT;
    }
  });
});
