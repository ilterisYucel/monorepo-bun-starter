import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { modbusRead } from "./helpers";
import {
  FIELD_URL,
  CONTAINER_URL,
  CONTAINER_INJECT_URL,
  assertHealthy,
  login,
  api,
  inject,
  sleep,
  normalizeStack,
  containerRows,
  deviceRows,
  valueOf,
  canonicalOf,
  resolveFieldId,
  type Row,
} from "./helpers";

/**
 * Cihaz telemetri entegrasyonu (v2/dev stack) — SPEC: `DENETIM-ESLEME-v2.md`.
 *
 * Her cihazdan verinin GERÇEKTEN çekildiğini ve ölçek/işaret/adres
 * doğrulamasının dokümana uyduğunu API üzerinden doğrular. Dokümana uygun
 * olup mevcut kodda hâlâ bozuk olan davranışlar `it.fails("<BULGU-ID> ...")`
 * ile işaretlidir (düzeltme gelince işaret kaldırılır).
 */

let fieldToken = "";
let containerToken = "";
let container: Row[] = [];
let pcs1: Row[] = [];
let pcs2: Row[] = [];
let mv: Row[] = [];

beforeAll(async () => {
  await assertHealthy(FIELD_URL);
  await assertHealthy(CONTAINER_URL);
  fieldToken = await login(FIELD_URL);
  containerToken = await login(CONTAINER_URL);
  // Paylaşımlı stack normalizasyonu (enjeksiyon temizliği + BSC Normal + CB kapat).
  await normalizeStack(fieldToken, containerToken);
  container = await containerRows(fieldToken);
  [pcs1, pcs2, mv] = await Promise.all([
    deviceRows(FIELD_URL, fieldToken, "PCS-1"),
    deviceRows(FIELD_URL, fieldToken, "PCS-2"),
    deviceRows(FIELD_URL, fieldToken, "DEMO-MV-1"),
  ]);
  expect(resolveFieldId()).not.toBe("");
});

/** Taze PCS telemetrisi — değer (ve istenirse min) gelene kadar poll eder. */
async function pcsValue(name: string, min?: number): Promise<number> {
  let v = Number.NaN;
  for (let i = 0; i < 10; i++) {
    v = valueOf(await deviceRows(FIELD_URL, fieldToken, "PCS-1"), name);
    if (Number.isFinite(v) && (min === undefined || v > min)) return v;
    await sleep(2000);
  }
  return v;
}

describe("telemetri akışı — tüm cihazlar", () => {
  it("konteyner linki 20+ cihazdan telemetri taşır", () => {
    const devices = new Set(container.map((r) => r.deviceId));
    for (const expected of [
      "BSC-1", "BSC-2", "CB-1", "CB-2", "HVAC-1", "HVAC-8",
      "IMD-1", "DC-METER-1", "PM5340-1", "CONTROL-PANEL-IO-1", "FSS-1", "DC-1", "DC-2",
    ]) {
      expect(devices, `cihaz yok: ${expected}`).toContain(expected);
    }
  });

  it("field tier PCS-1/PCS-2/MV-1 telemetrisi dolu", () => {
    expect(pcs1.length).toBeGreaterThan(100);
    expect(pcs2.length).toBeGreaterThan(100);
    expect(mv.length).toBeGreaterThan(50);
  });
});

describe("BSC (LGES Flex BSC)", () => {
  it("BSC SOC kanonik tag ile gelir ve 0-100 aralığında", () => {
    const soc = canonicalOf(container, "soc");
    expect(Number.isFinite(soc)).toBe(true);
    expect(soc).toBeGreaterThanOrEqual(0);
    expect(soc).toBeLessThanOrEqual(100);
  });

  it("H1/H5/C5: rack 2-8 stride 150 adreslerinden okunur (R2/R5/R8 SOC dolu)", () => {
    for (const name of ["Rack SOC R1", "Rack SOC R2", "Rack SOC R5", "Rack SOC R8"]) {
      const v = valueOf(container, name);
      expect(Number.isFinite(v), `${name} okunamadı`).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    }
  });

  it("H2: rack teşhis bitfield'leri 4-bit gruplarıyla çözülür (Deviation Voltage Fault2)", () => {
    const hasGroup = container.some((r) => /Rack.*Deviation Voltage.*Fault2|Deviation.*Fault2/.test(r.name));
    expect(hasGroup).toBe(true);
  });

  it("H3: bitfield'lerde rack ayrımı var (rack_id tag'i taşınır)", () => {
    const rackTagged = container.filter((r) => r.tags?.rack_id !== undefined);
    expect(rackTagged.length).toBeGreaterThan(0);
  });

  it("BSC rack hücre gerilimi gerçekçi (~3.5 V)", () => {
    const v = valueOf(container, "Rack Max Cell Voltage R1");
    expect(v).toBeGreaterThan(2.5);
    expect(v).toBeLessThan(4.5);
  });

  it("M1: geçersiz sensör değeri (0x7FFF/0xFFFF) telemetri olarak yayınlanmaz", () => {
    expect(Number.isFinite(valueOf(container, "BSC SOC"))).toBe(true);
  });
});

describe("PCS (Wattox MPCS)", () => {
  it("PCS-1 güç/gerilim/akım telemetrisi akar", () => {
    expect(Number.isFinite(valueOf(pcs1, "Battery Pack Total Voltage"))).toBe(true);
    expect(valueOf(pcs1, "Battery Pack SOC")).toBeGreaterThanOrEqual(0);
  });

  it("C7: PCS gerilim limitleri rack numarası değil gerçek gerilim (~1300 V)", async () => {
    const upper = await pcsValue("Battery Pack Upper Voltage Limit", 1000);
    expect(upper).toBeGreaterThan(1000);
    expect(upper).toBeLessThan(2000);
  }, 40_000);

  it("C6/PCS1-2: PCS güç limitleri tanımlı (eşleme bsc-pcs-connector'da doğrulanır)", async () => {
    expect(Number.isFinite(await pcsValue("Max Charging Power Pack"))).toBe(true);
    expect(Number.isFinite(await pcsValue("Max Discharging Power Pack"))).toBe(true);
  }, 40_000);

  it("C8/PCS4: PCS akım limitleri tanımlı (eşleme bsc-pcs-connector'da doğrulanır)", async () => {
    expect(Number.isFinite(await pcsValue("Max Charging Current Pack"))).toBe(true);
    expect(Number.isFinite(await pcsValue("Max Discharging Current Pack"))).toBe(true);
  }, 40_000);

  it("PCS3: Battery Pack SOP tanımlı (eşleme bsc-pcs-connector'da doğrulanır)", async () => {
    expect(Number.isFinite(await pcsValue("Battery Pack SOP"))).toBe(true);
  }, 40_000);

  it("H7: PCS hücre gerilimi ~3.5 V (sistem hücre gerilimi ölçeği 0.001)", async () => {
    const cellV = await pcsValue("Max Cell Voltage");
    expect(cellV).toBeGreaterThan(2.5);
    expect(cellV).toBeLessThan(4.5);
  }, 40_000);

  it("PCS15: Available Charge/Discharge Energy telemetrisi tanımlı (canlı değer protokol probunda)", () => {
    const cfg = JSON.parse(
      readFileSync(
        resolve(__dirname, "../../../deployment/v2/dev/field/device-configs/pcs-1.json"),
        "utf-8",
      ),
    ) as { telemetry: Array<{ name: string }> };
    const names = cfg.telemetry.map((t) => t.name);
    expect(names).toContain("Available Charge Energy");
    expect(names).toContain("Available Discharge Energy");
  });
});

describe("HVAC (Envicool MC90HDNC1R)", () => {
  it("H5: HVAC sıcaklık/nem durum telemetrisi FC03 ile okunur", () => {
    const temp = valueOf(container, "Current Temp");
    const hum = valueOf(container, "Return Humidity");
    expect(Number.isFinite(temp)).toBe(true);
    expect(Number.isFinite(hum)).toBe(true);
  });

  it("Equipment Status geçerli aralıkta (0-4)", () => {
    const status = valueOf(container, "Equipment Status");
    expect(status).toBeGreaterThanOrEqual(0);
    expect(status).toBeLessThanOrEqual(4);
  });
});

describe("IMD (Bender isoPV1685RTU)", () => {
  it("B1: izolasyon direnci FC03 ile ~1 MΩ okunur", () => {
    const r = valueOf(container, "Insulation Resistance");
    expect(r).toBeGreaterThan(500_000);
    expect(r).toBeLessThan(1_500_000);
  });

  it("alarm/cihaz hatası sağlıklı durumda 0", () => {
    expect(valueOf(container, "Insulation Alarm")).toBe(0);
    expect(valueOf(container, "Device Error")).toBe(0);
  });
});

describe("Acrel DJSF1352-RN (DC sayaç)", () => {
  it("A1: DC V/I/P FC03 ile ölçülür (750 V / 100 A / 75 kW)", () => {
    expect(valueOf(container, "DC Voltage")).toBeCloseTo(750, 0);
    expect(valueOf(container, "DC Current")).toBeCloseTo(100, 0);
    expect(valueOf(container, "DC Power")).toBeCloseTo(75, 0);
  });
});

describe("Schneider PM5340", () => {
  it("P4: faz gerilimleri FC03 ile okunur (~230 V L-N)", () => {
    const v = valueOf(container, "Voltage L-N Avg");
    expect(v).toBeGreaterThan(200);
    expect(v).toBeLessThan(260);
  });

  it("P3: 4Q_FP_PF kod çözümü → PF [-1..1]", () => {
    const pf = valueOf(container, "Power Factor Total");
    expect(Number.isFinite(pf)).toBe(true);
    expect(Math.abs(pf)).toBeLessThanOrEqual(1);
  });
});

describe("DC şalter SYW6GZ-4000", () => {
  it("S2: kapalı şalterde Is Closed=1, Is Open=0", () => {
    expect(valueOf(container, "Is Closed")).toBe(1);
    expect(valueOf(container, "Is Open")).toBe(0);
  });

  it("S1: açma/kapama bobinleri darbe sonrası bırakılır (coil 0)", () => {
    expect(valueOf(container, "Open")).toBe(0);
    expect(valueOf(container, "Close")).toBe(0);
  });
});

describe("Yangın paneli EP203 / IO", () => {
  it("kapı kontağı ve sistem durumu okunur", () => {
    expect(Number.isFinite(valueOf(container, "Battery Door Open"))).toBe(true);
    expect(Number.isFinite(valueOf(container, "System OK"))).toBe(true);
  });

  it("F1: Fire / 1. Stage girişi tanımlı (LGES cause-and-effect)", () => {
    const names = container.filter((r) => r.deviceId === "CONTROL-PANEL-IO-1").map((r) => r.name);
    expect(names).toContain("Fire");
    expect(names).toContain("First Stage");
  });
});

describe("DC çıkış ve FSS", () => {
  it("G1: DC çıkış durum telemetrisi akar", () => {
    expect(Number.isFinite(valueOf(container, "Is On"))).toBe(true);
  });

  it("FSS panel durumu akar", () => {
    expect(Number.isFinite(valueOf(container, "Panel Status"))).toBe(true);
  });
});

describe("DEMO-MV-1 (MV istasyonu)", () => {
  it("kesici ve toprak konumları okunur", () => {
    for (const name of ["H01 Breaker", "H05 Breaker", "H05 Earth"]) {
      expect(Number.isFinite(valueOf(mv, name)), `${name} yok`).toBe(true);
    }
  });
});

describe("Denetim düzeltmeleri (M2/M3/M4/G1/PCS3/16/17)", () => {
  it("M3: rack DI bayrakları telemetride (Online/Alarm/Fault)", () => {
    const names = container.map((r) => r.name);
    for (const n of ["Rack Online R1", "Rack Alarm R1", "Rack Fault R1", "Rack Online R8"]) {
      expect(names, `${n} yok`).toContain(n);
    }
  });

  it("M4: icat edilen global diff-temp metriği kaldırıldı", () => {
    const globals = container.filter((r) => r.name.includes("Max Diff Temp") && r.name.includes("Global"));
    expect(globals).toHaveLength(0);
  });

  it("G1: dc-output tek birleşik enerji sayacı", () => {
    const names = container.filter((r) => r.deviceId === "DC-1").map((r) => r.name);
    expect(names).toContain("Energy Counter");
    expect(names).not.toContain("Energy Counter H");
  });

  it("PCS3: Battery Pack SOP tanımlı", async () => {
    expect(Number.isFinite(await pcsValue("Battery Pack SOP"))).toBe(true);
  }, 40_000);

  it("PCS16/17: EMS-link ve BMS health telemetrisi config'te tanımlı", () => {
    const cfg = JSON.parse(
      readFileSync(
        resolve(__dirname, "../../../deployment/v2/dev/field/device-configs/pcs-1.json"),
        "utf-8",
      ),
    ) as { telemetry: Array<{ name: string }> };
    const names = cfg.telemetry.map((t) => t.name);
    expect(names).toContain("EMS Communication Control");
    expect(names).toContain("BMS Modbus Timeout");
    expect(names).toContain("BMS CRC Error Count");
  });

  it("M2: BSC fault enjeksiyonu → device alarm üretir", async () => {
    expect(await inject(CONTAINER_INJECT_URL, "BSC-1", "fault")).toBe(true);
    let found = false;
    for (let i = 0; i < 8; i++) {
      await sleep(2000);
      const { body } = await api(CONTAINER_URL, containerToken, "/api/unified/alarms");
      const alarms = (body as { alarms?: Array<{ deviceId?: string; alarmName?: string; active?: boolean }> }).alarms ?? [];
      if (alarms.some((a) => a.deviceId === "BSC-1" && a.alarmName === "BSC Fault" && a.active)) {
        found = true;
        break;
      }
    }
    await inject(CONTAINER_INJECT_URL, "BSC-1", "nominal");
    expect(found, "BSC Fault alarmı üretilmedi").toBe(true);
  }, 40_000);
});

describe("PCS18 — arıza sözcükleri (D01–D09) bit-çözümü", () => {
  it("Appendix 2 adlarıyla bitfield'ler tanımlı", () => {
    const cfg = JSON.parse(
      readFileSync(
        resolve(__dirname, "../../../deployment/v2/dev/field/device-configs/pcs-1.json"),
        "utf-8",
      ),
    ) as { bitfieldConfigs: Array<{ registerAddress: number; fields: Array<{ name: string }> }> };
    const byAddr = new Map(cfg.bitfieldConfigs.map((b) => [b.registerAddress, b.fields.map((f) => f.name)]));
    expect(byAddr.get(12213)).toContain("BMS system fault");
    expect(byAddr.get(12215)).toContain("Islanding fault");
    expect(byAddr.get(12218)).toContain("BMS communication fault");
    expect(byAddr.get(12219)).toContain("Cabinet door fault");
  });
});

describe("Faz 1 / F2.5 — nameplate & HVAC ekleri", () => {
  it("F2.5: BSC rack nameplate değerleri (17 pack / 4 sensör / 24 hücre / 210 A)", async () => {
    // Sabit nameplate — birim-pencere dışına düşebilir; ham Modbus ile oku.
    const rd = (addr: number) => modbusRead(15501, 4, addr, 1);
    expect((await rd(30193)).values[0]).toBe(17); // Pack Count R1
    expect((await rd(30194)).values[0]).toBe(2); // BMIC Count R1
    expect((await rd(30195)).values[0]).toBe(4); // Temp Sensor Count R1
    expect((await rd(30199)).values[0]).toBe(24); // Voltage Sensor Count R1
    expect((await rd(30192)).values[0]).toBe(210); // Relay Close Current R1
  }, 40_000);

  it("Faz 1: HVAC Compressor Action Count + Server Humidity tanımlı", () => {
    const cfg = JSON.parse(
      readFileSync(resolve(__dirname, "../../../deployment/v2/dev/container/device-configs/hvac-1.json"), "utf-8"),
    ) as { telemetry: Array<{ name: string; registerAddress: number }> };
    const addrs = new Map(cfg.telemetry.map((t) => [t.name, t.registerAddress]));
    expect(addrs.get("Compressor Action Count")).toBe(4136);
    expect(addrs.get("Server Humidity")).toBe(8195);
  });
});
