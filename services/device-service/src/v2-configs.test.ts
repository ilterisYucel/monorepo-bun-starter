// v2 device-config'leri Sim-Lab hedefli ve saha biçiminde — SPEC T-19 (R-3) kanıtı.
// AK-3.2: dönüştürülmüş config'ler şemadan geçer; simülatör-only alan yok; hedef `sim-lab`.
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { deviceConfigFileSchema } from "@gd-monorepo/shared-types";

/** Repo kökü — `configs/` bulunana kadar yukarı yürünür (Stryker sandbox uyumu). */
const findRepoRoot = (start: string): string => {
  let dir = start;
  while (!existsSync(join(dir, "configs")) && dir !== dirname(dir)) dir = dirname(dir);
  return dir;
};

const repoRoot = findRepoRoot(__dirname);
const V2 = "deployment/v2/dev";
const CONFIG_DIRS = [
  join(repoRoot, V2, "container/device-configs"),
  join(repoRoot, V2, "container2/device-configs"),
  join(repoRoot, V2, "site/device-configs"),
];

interface RawDeviceConfig {
  deviceId?: unknown;
  transport?: unknown;
  heartbeat?: unknown;
  connector?: { sim?: unknown; device?: { connection?: { host?: unknown } } };
  connection?: { host?: unknown; port?: unknown };
  periodicWrites?: Array<{ mode?: unknown }>;
}

const files = CONFIG_DIRS.flatMap((dir) =>
  readdirSync(dir)
    .filter((f) => f.endsWith(".json") && !f.startsWith("service."))
    .map((f) => join(dir, f)),
);

describe("v2 device-config'leri (T-19 / AK-3.2)", () => {
  it("tüm config'ler şemadan geçer ve simülatör-only alan taşımaz", () => {
    expect(files.length).toBeGreaterThan(30);
    for (const file of files) {
      const raw = JSON.parse(readFileSync(file, "utf8")) as RawDeviceConfig;
      const parsed = deviceConfigFileSchema.safeParse(raw);
      expect(parsed.success, `${file}: şema`).toBe(true);
      expect(raw.transport, `${file}: transport`).toBeUndefined();
      expect(raw.heartbeat, `${file}: heartbeat`).toBeUndefined();
      expect(raw.connector?.sim, `${file}: connector.sim`).toBeUndefined();
    }
  });

  it("tüm connection hedefleri sim-lab ve portları sayısal", () => {
    for (const file of files) {
      const raw = JSON.parse(readFileSync(file, "utf8")) as RawDeviceConfig;
      expect(raw.connection?.host, `${file}: host`).toBe("sim-lab");
      expect(typeof raw.connection?.port, `${file}: port`).toBe("number");
      if (raw.connector?.device !== undefined) {
        expect(raw.connector.device.connection?.host, `${file}: connector host`).toBe("sim-lab");
      }
    }
  });

  it("BSC config'leri periodicWrites(counter) taşır", () => {
    const bscFiles = files.filter((f) => /(^|\/)bsc-\d+\.json$/.test(f));
    expect(bscFiles.length).toBeGreaterThan(0);
    for (const file of bscFiles) {
      const raw = JSON.parse(readFileSync(file, "utf8")) as RawDeviceConfig;
      expect(raw.periodicWrites?.[0]?.mode, `${file}: periodicWrites`).toBe("counter");
    }
  });

  it("v2 .env.example dosyalarında simülatör env'leri yok", () => {
    for (const envFile of [".env.example"]) {
      for (const tier of ["container", "container2"]) {
        const path = join(repoRoot, V2, tier, envFile);
        if (!existsSync(path)) continue;
        const text = readFileSync(path, "utf8");
        expect(text, path).not.toMatch(/PCS_BMS_TARGET|PCS_EMS_TARGET|DEBUG_INJECT/);
      }
    }
  });
});
