import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { modbusRead } from "../helpers";
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
} from "../helpers";

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


});



describe("PCS (Wattox MPCS)", () => {
  it("PCS-1 güç/gerilim/akım telemetrisi akar", () => {
    expect(Number.isFinite(valueOf(pcs1, "Battery Pack Total Voltage"))).toBe(true);
    expect(valueOf(pcs1, "Battery Pack SOC")).toBeGreaterThanOrEqual(0);
  });












});

describe("HVAC (Envicool MC90HDNC1R)", () => {
  it("H5: HVAC sıcaklık/nem durum telemetrisi FC03 ile okunur", () => {
    const temp = valueOf(container, "Current Temp");
    const hum = valueOf(container, "Return Humidity");
    expect(Number.isFinite(temp)).toBe(true);
    expect(Number.isFinite(hum)).toBe(true);
  });


});

describe("IMD (Bender isoPV1685RTU)", () => {
  it("B1: izolasyon direnci FC03 ile ~1 MΩ okunur", () => {
    const r = valueOf(container, "Insulation Resistance");
    expect(r).toBeGreaterThan(500_000);
    expect(r).toBeLessThan(1_500_000);
  });


});

describe("Acrel DJSF1352-RN (DC sayaç)", () => {
  it("A1: DC V/I/P FC03 ile ölçülür (bara gerilimi + P = V·I)", async () => {
    // DC metre plant'a bağlıdır (dizinin DC barasını ölçer): sabit 750/100/75
    // yerine ölçüm tutarlılığı ve kW ölçeği doğrulanır (3P24S → 1101–1469 V).
    let v = 0;
    let i = 0;
    let p = 0;
    for (let n = 0; n < 10; n++) {
      const rows = await containerRows(fieldToken);
      v = valueOf(rows, "DC Voltage");
      i = valueOf(rows, "DC Current");
      p = valueOf(rows, "DC Power");
      if (v > 1000) break;
      await sleep(2000);
    }
    expect(v).toBeGreaterThan(1000);
    expect(v).toBeLessThan(1500);
    expect(p).toBeCloseTo((v * i) / 1000, 1);
  }, 40_000);
});



describe("DC şalter SYW6GZ-4000", () => {
  it("S2: kapalı şalterde Is Closed=1, Is Open=0", () => {
    expect(valueOf(container, "Is Closed")).toBe(1);
    expect(valueOf(container, "Is Open")).toBe(0);
  });


});







describe("Denetim düzeltmeleri (M2/M3/M4/G1/PCS3/16/17)", () => {










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




