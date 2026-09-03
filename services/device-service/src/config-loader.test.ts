import { describe, it, expect } from "vitest";
import { fileURLToPath } from "node:url";
import type { ModbusTelemetryData } from "@gd-monorepo/shared-types";
import { DeviceConfigLoader } from "./config-loader";

const CONFIG_DIR = fileURLToPath(new URL("../config/", import.meta.url));

describe("DeviceConfigLoader", () => {
  describe("constructor", () => {
    it("throws when configDir is empty", () => {
      expect(() => new DeviceConfigLoader("")).toThrow(
        "[DeviceConfigLoader] configDir bos olamaz",
      );
    });
  });

  describe("parseFile (via public API)", () => {
    it("throws when directory does not exist", () => {
      const loader = new DeviceConfigLoader("/tmp/nonexistent-xyz123");
      expect(() => loader.load()).toThrow(/dizini bulunamadi/);
    });
  });

  describe("load() — gerçek config dizini", () => {
    it("tüm cihaz config'lerini doğrular (bsc, pcs, emu dahil)", () => {
      const loader = new DeviceConfigLoader(CONFIG_DIR);
      const { devices } = loader.load();

      const ids = devices.map((d) => d.deviceId);
      expect(ids).toContain("BSC-1");
      expect(ids).toContain("PCS-1");
      expect(ids).toContain("EMU-1");
    });

    it("PCS instance'ları ayrı adres pencerelerinde (5000+300×(n−1))", () => {
      const loader = new DeviceConfigLoader(CONFIG_DIR);
      const { devices } = loader.load();

      // 2026-09-02: konteyner başına TEK PCS — yalnızca pcs-1.json kaldı.
      const pcs1 = devices.find((d) => d.deviceId === "PCS-1")!;
      const v1 = pcs1.telemetry.find((t) => t.name === "AC Voltage AB") as ModbusTelemetryData | undefined;

      expect(v1?.registerAddress).toBe(5000);
    });
  });
});
