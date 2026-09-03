import { describe, it, expect } from "vitest";
import {
  TIER_LOGGER_DEFAULTS,
  loggerConfigForTier,
} from "./logger-config";
import type { ServiceTier } from "@gd-monorepo/shared-types";

/**
 * LoggerConfig tier kontratı (T0.5 — platform katmanı):
 *
 * - `TIER_LOGGER_DEFAULTS`:
 *   - container: console + file (timescale YOK)
 *   - field: console + file + timescale
 *   - boss: console + file + timescale
 * - `loggerConfigForTier(tier, overrides)`: tier varsayılanı + override
 *   birleşimi — yeni obje döner, varsayılanı DEĞİŞTİRMEZ.
 */

describe("LoggerConfig tier varsayılanları (T0.5)", () => {
  describe("TIER_LOGGER_DEFAULTS", () => {
    it("üç tier için de tanımlıdır", () => {
      const tiers: ServiceTier[] = ["container", "field", "boss"];
      for (const tier of tiers) {
        expect(TIER_LOGGER_DEFAULTS[tier]).toBeDefined();
      }
    });

    it("container: console + file (timescale YOK)", () => {
      const c = TIER_LOGGER_DEFAULTS.container;
      expect(c.sinks).toContain("console");
      expect(c.sinks).toContain("file");
      expect(c.sinks).not.toContain("timescale");
    });

    it("field: console + file + timescale", () => {
      const c = TIER_LOGGER_DEFAULTS.field;
      expect(c.sinks).toEqual(
        expect.arrayContaining(["console", "file", "timescale"]),
      );
    });

    it("boss: console + file + timescale", () => {
      const c = TIER_LOGGER_DEFAULTS.boss;
      expect(c.sinks).toEqual(
        expect.arrayContaining(["console", "file", "timescale"]),
      );
    });

    it("tüm tier'ların signingKeyPath'i doludur", () => {
      for (const tier of ["container", "field", "boss"] as ServiceTier[]) {
        expect(
          TIER_LOGGER_DEFAULTS[tier].signingKeyPath.trim().length,
        ).toBeGreaterThan(0);
      }
    });
  });

  describe("loggerConfigForTier", () => {
    it("override'sız tier varsayılanını döner", () => {
      expect(loggerConfigForTier("container")).toEqual(
        TIER_LOGGER_DEFAULTS.container,
      );
    });

    it("override alanları tier varsayılanını ezer", () => {
      const out = loggerConfigForTier("field", {
        level: "error",
        batchSize: 10,
      });
      expect(out.level).toBe("error");
      expect(out.batchSize).toBe(10);
      expect(out.sinks).toEqual(TIER_LOGGER_DEFAULTS.field.sinks);
    });

    it("sink listesi override edilebilir", () => {
      const out = loggerConfigForTier("container", { sinks: ["console"] });
      expect(out.sinks).toEqual(["console"]);
    });
  });
});
