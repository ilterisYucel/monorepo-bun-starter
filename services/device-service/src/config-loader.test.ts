import { describe, it, expect } from "vitest";
import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { DeviceConfigLoader } from "./config-loader";

// Source of truth — kök configs/ (alet adıyla kanonik cihaz config'leri).
// Testler proje/deployment dizinlerine değil buraya bakar (bkz. AGENTS-DEVICE-CONFIG.md).
const CONFIG_DIR = fileURLToPath(new URL("../../../configs/", import.meta.url));

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

  describe("load() — source of truth (kök configs/)", () => {
    it("tüm cihaz config dosyalarını yükler ve şemadan geçirir", () => {
      const { devices } = new DeviceConfigLoader(CONFIG_DIR).load();

      const deviceFiles = readdirSync(CONFIG_DIR).filter(
        (f) => f.endsWith(".json") && !f.startsWith("service."),
      );
      expect(devices).toHaveLength(deviceFiles.length);
      for (const device of devices) {
        expect(device.deviceId).toBeTruthy();
        expect(device.name).toBeTruthy();
        expect(device.telemetry.length).toBeGreaterThan(0);
      }
    });

    it("service.json yüklenir (global servis konfigürasyonu)", () => {
      const { service } = new DeviceConfigLoader(CONFIG_DIR).load();
      expect(service.redis.host).toBeTruthy();
      expect(service.redis.port).toBeGreaterThan(0);
    });
  });
});
