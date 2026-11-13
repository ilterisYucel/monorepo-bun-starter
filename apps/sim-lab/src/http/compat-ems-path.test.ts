// Senaryo → EMS okuma yolu — SPEC T-15 (R-2/G3) kanıtı.
// AK-4.2: `/compat` senaryosu gerçek Modbus TCP okumasında gözlemlenir (fake Plant yok).
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { ModbusDevice } from "@gd-monorepo/core";
import {
  FaultManager,
  Plant,
  expandSite,
  normalizeSiteSpec,
} from "@gd-monorepo/simulators/physical";
import { compatInject } from "./compat-inject";

/** Repo kökü — `configs/` bulunana kadar yukarı yürünür (Stryker sandbox uyumu). */
const findRepoRoot = (start: string): string => {
  let dir = start;
  while (!existsSync(join(dir, "configs")) && dir !== dirname(dir)) dir = dirname(dir);
  return dir;
};

const repoRoot = findRepoRoot(__dirname);
const seed = process.pid % 300;

const spec = normalizeSiteSpec({
  name: "compat-ems",
  templatesDir: join(repoRoot, "configs"),
  network: {
    bindHost: "127.0.0.1",
    emsHost: "127.0.0.1",
    containerPortBase: 25000 + seed,
    containerPortStride: 100,
    fieldPortBase: 34000 + seed,
  },
  containers: {
    count: 1,
    bscPerContainer: 1,
    racksPerBsc: 1,
    hvacPerContainer: 0,
    hvacZoneMap: "per-bus",
    aux: {
      cb: false,
      dcMeter: false,
      dcOutput: 0,
      pm5340: false,
      imd: false,
      fss: false,
      controlPanelIo: false,
    },
  },
  pcs: { perContainer: 0 },
  mv: { stations: [] },
} as never);

const model = expandSite(spec, repoRoot);
const plant = new Plant(model);
const faults = new FaultManager(plant);

const emsDevice = (key: string): ModbusDevice => {
  const cfg = plant.devices.get(key)!.config!;
  const telemetryList = cfg.telemetry.map((t) => ({
    ...t,
    value: 0,
    timestamp: new Date().toISOString(),
    deviceId: cfg.deviceId,
  }));
  return new ModbusDevice({
    id: cfg.deviceId,
    name: cfg.name,
    manufacturer: "x",
    model: cfg.model ?? "x",
    connection: { ...cfg.connection, host: "127.0.0.1", timeout: 3000 },
    telemetryList,
    ...(cfg.bitfieldConfigs !== undefined ? { bitfieldConfigs: cfg.bitfieldConfigs } : {}),
  } as never);
};

const readValue = async (device: ModbusDevice, name: string): Promise<number> => {
  const rows = await device.read();
  const row = rows.find((r) => r.name === name);
  if (row === undefined) throw new Error(`telemetri yok: ${name}`);
  return Number(row.value);
};

beforeAll(async () => {
  await plant.start();
  // Deterministik test: otomatik döngü sim zamanını ilerletmesin; assist elle koşulur.
  plant.paused = true;
  plant.assist.heartbeat = true;

  // BSC'yi devreye al (plant.test.ts#startString ile aynı akış, PCS olmadan).
  const run = (seconds: number): void => {
    for (let t = 0; t < seconds; t += 10) {
      plant.advance(10);
      (plant as unknown as { runAssist(): void }).runAssist();
    }
  };
  const bsc = plant.bscs.get("C1.BSC-1")!;
  bsc.writeHolding(40010, 2);
  run(30);
  bsc.writeHolding(40010, 5);
  run(20);
});

afterAll(async () => {
  await plant.stop();
});

describe("compat senaryosu → EMS okuma yolu (AK-4.2)", () => {
  it("soc:42 raf SOC'sini gerçek Modbus okumasında değiştirir", async () => {
    const device = emsDevice("C1.BSC-1");
    await device.connect();
    try {
      const before = await readValue(device, "BSC SOC");
      expect(before).toBeGreaterThan(0);

      const result = await compatInject(plant, faults, "c1", "BSC-1", "soc:42");
      expect(result.applied).toBe(true);

      const after = await readValue(device, "BSC SOC");
      expect(after).toBeGreaterThan(40);
      expect(after).toBeLessThan(44);
    } finally {
      await device.disconnect();
    }
  });

  it("diff_temp sensör arızası EMS'in okuduğu maks. paket sıcaklığını yükseltir", async () => {
    const device = emsDevice("C1.BSC-1");
    await device.connect();
    try {
      const before = await readValue(device, "Max Pack Temp");

      const result = await compatInject(plant, faults, "c1", "BSC-1", "diff_temp");
      expect(result.applied).toBe(true);
      plant.advance(1);

      const after = await readValue(device, "Max Pack Temp");
      expect(after).toBeGreaterThan(before);
      expect(after).toBeGreaterThan(100); // sensör açık devre → 127 °C
    } finally {
      await device.disconnect();
    }
  });
});
