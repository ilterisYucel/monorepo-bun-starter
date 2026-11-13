import { describe, it, expect } from "vitest";
import { existsSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { DeviceConfigLoader } from "./config-loader";

// Source of truth — kök configs/ (alet adıyla kanonik cihaz config'leri).
// Testler proje/deployment dizinlerine değil buraya bakar (bkz. AGENTS-DEVICE-CONFIG.md).
/** Repo kökü — `configs/` bulunana kadar yukarı yürünür (Stryker sandbox uyumu). */
const findRepoRoot = (start: string): string => {
  let dir = start;
  while (!existsSync(join(dir, "configs")) && dir !== dirname(dir)) dir = dirname(dir);
  return dir;
};
const CONFIG_DIR = join(findRepoRoot(dirname(fileURLToPath(import.meta.url))), "configs");

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

describe("DeviceConfigLoader — fail-fast (K2 / AK-1.2)", () => {
  const withConfig = (name: string, body: Record<string, unknown>, run: (dir: string) => void): void => {
    const dir = mkdtempSync(join(tmpdir(), "dev-loader-"));
    try {
      writeFileSync(
        join(dir, "service.json"),
        JSON.stringify({ redis: { host: "127.0.0.1", port: 6379 } }),
      );
      writeFileSync(join(dir, name), JSON.stringify(body));
      run(dir);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  };

  it("transport.kind:'simulator' → dosya + deviceId içeren hata", () => {
    withConfig("bad.json", { deviceId: "BSC-1", transport: { kind: "simulator" } }, (dir) => {
      expect(() => new DeviceConfigLoader(dir).load()).toThrow(
        /transport\.kind "simulator" artık desteklenmiyor \(Dosya: bad\.json, deviceId: BSC-1\)/,
      );
    });
  });

  it("connector.sim → dosya + deviceId içeren hata", () => {
    withConfig("bad.json", { deviceId: "BSC-1", connector: { sim: { registerMap: "x" } } }, (dir) => {
      expect(() => new DeviceConfigLoader(dir).load()).toThrow(
        /connector\.sim artık desteklenmiyor \(Dosya: bad\.json, deviceId: BSC-1\)/,
      );
    });
  });

  it("heartbeat → periodicWrites yönlendirmeli hata", () => {
    withConfig("bad.json", { deviceId: "BSC-1", heartbeat: { telemetry: "HB", intervalMs: 1000 } }, (dir) => {
      expect(() => new DeviceConfigLoader(dir).load()).toThrow(
        /heartbeat alanı kaldırıldı \(Dosya: bad\.json, deviceId: BSC-1\).*periodicWrites/,
      );
    });
  });
});
