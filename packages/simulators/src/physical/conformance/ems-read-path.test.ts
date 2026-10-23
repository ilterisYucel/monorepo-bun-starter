// EMS okuma yolu testi — device-service'in KULLANDIĞI sınıfla (packages/core ModbusDevice)
// gerçek Modbus TCP üzerinden, export edilen config'in TÜM telemetrisini okur.
// Amaç: simülatörün yayınladığı yüz ile EMS config'i arasında adres/FC/tip uyumsuzluğu
// kalmadığını ve okunan mühendislik değerlerinin model durumuyla tutarlı olduğunu kanıtlamak.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { join, resolve } from "node:path";
import { ModbusDevice } from "@gd-monorepo/core";
import type { ModbusTelemetryData, TelemetryData } from "@gd-monorepo/shared-types";
import { expandSite, normalizeSiteSpec } from "../site/site-config";
import { Plant } from "../site/plant";
import type { DeviceConfig } from "../config/device-configs";

const repoRoot = resolve(__dirname, "../../../../..");
const spec = normalizeSiteSpec({
  name: "ems-read",
  templatesDir: join(repoRoot, "configs"),
  network: { bindHost: "127.0.0.1", emsHost: "127.0.0.1", containerPortBase: 41000, containerPortStride: 100, fieldPortBase: 42000 },
  containers: { count: 1, bscPerContainer: 2, racksPerBsc: 8, hvacPerContainer: 2, hvacZoneMap: "per-bus" },
  mv: { stations: [{ id: "DEMO-MV-1", incomer: ["H01"], feeders: { H04: [1] } }] },
} as never);
const model = expandSite(spec, repoRoot);
const plant = new Plant(model);

function emsDevice(cfg: DeviceConfig): ModbusDevice {
  const telemetryList = cfg.telemetry.map((t) => ({ ...t, value: 0, timestamp: new Date().toISOString(), deviceId: cfg.deviceId }) as unknown as ModbusTelemetryData);
  return new ModbusDevice({
    id: cfg.deviceId,
    name: cfg.name,
    manufacturer: "x",
    model: cfg.model ?? "x",
    connection: { ...cfg.connection, host: "127.0.0.1", timeout: 3000 } as never,
    telemetryList,
    ...(cfg.bitfieldConfigs ? { bitfieldConfigs: cfg.bitfieldConfigs as never } : {}),
  } as never);
}
const val = (rows: TelemetryData[], name: string): number => {
  const r = rows.find((x) => x.name === name);
  if (!r) throw new Error(`telemetri yok: ${name}`);
  return Number(r.value);
};

beforeAll(async () => {
  await plant.start();
  plant.assist.heartbeat = true;
  // bir diziyi devreye al ki ölçümler sıfırdan farklı olsun
  const b = plant.bscs.get("C1.BSC-1")!;
  const pcs = plant.pcss.get("PCS-1")!;
  b.writeHolding(40010, 2);
  plant.advance(30);
  b.writeHolding(40010, 5);
  plant.advance(20);
  pcs.writeSetting(0x0e14, 1);
  plant.advance(20);
  pcs.writeSetting(0x0e19, 700);
  plant.advance(30);
}, 30000);
afterAll(async () => {
  await plant.stop();
});

/** Vendor'a göre gerçek cihazın "geçersiz" (sentinel) döndürdüğü noktalar. */
const SENTINEL_OK: Record<string, RegExp[]> = {
  // MC Series A3 §7.3: 1#/2# harici genleşme T/H ve zorunlu modlar (0x2101–0x2104) "not involving"
  // 0x2000–0x2002: EMS henüz yazmadıysa 32767 (§7.3 "sensör arızalı" değeri) → INT16 sentinel
  hvac: [/External Expansion/, /^Forced (Cooling|Air Supply|Standby|Heating)$/, /^Server Temp (Max|Min|Avg)$/],
  // BSC: raflar Not-Initialized değilken kullanılmayan sayaç/konum alanları olabilir
  bsc: [],
  "wattox-pcs": [],
  cb: [], "dc-meter": [], "dc-output": [], "energy-analyzer": [], imd: [], fss: [], "control-panel-io": [], "demo-mv-station": [],
};

const types = ["bsc", "wattox-pcs", "hvac", "cb", "dc-meter", "dc-output", "energy-analyzer", "imd", "fss", "control-panel-io", "demo-mv-station"] as const;

describe.each(["uyumlu", "gercek"] as const)("EMS ModbusDevice okuma yolu — profil %s", (profile) => {
  for (const t of types) {
    it(`${t}: config'teki tüm telemetri hatasız okunur`, async () => {
      plant.setProfile(profile);
      const d = model.devices.find((x) => x.type === t)!;
      const dev = emsDevice(d.config);
      await dev.connect();
      try {
        const rows = await dev.read();
        // EMS, Common encoding sentinel'lerini (0xFFFF / 0x7FFF / 0x8000) "veri yok" sayıp düşürür.
        // Düşen noktalar yalnız vendor'ın "not involving / invalid" dediği noktalar olmalı.
        const got = new Set(rows.map((r) => r.name));
        const dropped = d.config.telemetry.map((x) => x.name).filter((n) => !got.has(n));
        expect(dropped.filter((n) => !SENTINEL_OK[t].some((re) => re.test(n)))).toEqual([]);
      } finally {
        await dev.disconnect();
      }
    }, 20000);
  }
});

describe("EMS'in okuduğu değerler model durumuyla tutarlı", () => {
  it("BSC: SOC, online raf, DC gerilim, raf 2 durumu (adım 150)", async () => {
    plant.setProfile("gercek");
    const d = model.devices.find((x) => x.key === "C1.BSC-1")!;
    const dev = emsDevice(d.config);
    await dev.connect();
    const rows = await dev.read();
    await dev.disconnect();
    const b = plant.bscs.get("C1.BSC-1")!;
    expect(val(rows, "BSC State")).toBe(3);
    expect(val(rows, "Online Rack No")).toBe(8);
    expect(Math.abs(val(rows, "BSC SOC") - b.soc())).toBeLessThan(0.05);
    expect(Math.abs(val(rows, "BSC DC Voltage") - b.busVoltage)).toBeLessThan(2);
    expect(val(rows, "Rack State R2")).toBe(9);
  }, 20000);

  it("PCS: işletme durumu, şebeke aktif güç, BMS bloğundan SOC", async () => {
    const d = model.devices.find((x) => x.key === "PCS-1")!;
    const dev = emsDevice(d.config);
    await dev.connect();
    const rows = await dev.read();
    await dev.disconnect();
    const pcs = plant.pcss.get("PCS-1")!;
    expect(val(rows, "PCS Operation Status")).toBe(pcs.opStatus);
    expect(Math.abs(val(rows, "Grid Active Power") - pcs.pAc)).toBeLessThan(3);
    expect(Math.abs(val(rows, "Battery Pack SOC") - plant.bscs.get("C1.BSC-1")!.soc())).toBeLessThan(0.5);
  }, 20000);

  it("üstyazım EMS tarafından görülür (hold → ModbusDevice okur)", async () => {
    await plant.applyPoint("C1.HVAC-1", "Current Temp", 37.2, "hold", "test");
    const d = model.devices.find((x) => x.key === "C1.HVAC-1")!;
    const dev = emsDevice(d.config);
    await dev.connect();
    const rows = await dev.read();
    await dev.disconnect();
    expect(val(rows, "Current Temp")).toBeCloseTo(37.2, 5);
    await plant.applyPoint("C1.HVAC-1", "*", null, "clear", "test");
  }, 20000);
});
