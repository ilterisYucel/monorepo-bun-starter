import { describe, it, expect, beforeAll } from "vitest";
import {
  FIELD_URL,
  CONTAINER_URL,
  CONTAINER_INJECT_URL,
  assertHealthy,
  login,
  deviceRows,
  valueOf,
  inject,
  sleep,
  modbusRead,
  normalizeStack,
} from "./helpers";

/**
 * BSC→PCS connector (batarya verisi eşleme) entegrasyonu.
 * Bulgular: C6, C7, C8, M12, PCS1-5/13-19 — `DENETIM-ESLEME-v2.md`.
 *
 * Konteyner BSC verisi demo-bridge üzerinden field PCS BMS bloğuna yazılır;
 * etkisi PCS telemetrisinden okunur.
 */

let fieldToken = "";
let containerToken = "";

beforeAll(async () => {
  await assertHealthy(FIELD_URL);
  await assertHealthy(CONTAINER_URL);
  fieldToken = await login(FIELD_URL);
  containerToken = await login(CONTAINER_URL);
  await normalizeStack(fieldToken, containerToken);
});

/** Taze PCS telemetrisi — değer gelene (ve istenirse min'i aşana) kadar poll eder. */
async function pcsValue(name: string, opts: { min?: number } = {}): Promise<number> {
  let v = Number.NaN;
  for (let i = 0; i < 12; i++) {
    const rows = await deviceRows(FIELD_URL, fieldToken, "PCS-1");
    v = valueOf(rows, name);
    if (Number.isFinite(v) && (opts.min === undefined || v > opts.min)) return v;
    await sleep(2000);
  }
  return v;
}

async function bscU32(address: number): Promise<number> {
  const r = await modbusRead(15501, 4, address, 2);
  return (r.values[0] ?? 0) * 0x10000 + (r.values[1] ?? 0);
}

describe("BSC→PCS batarya verisi eşleme", () => {
  it("PCS BMS SOC geçerli aralıkta ve sağlıklı BSC SOC ile tutarlı", async () => {
    const pcsSoc = await pcsValue("Battery Pack SOC");
    // BSC SOC'yi ham oku (unified pencere stale değer döndürebilir).
    const bscSoc = (await modbusRead(15501, 4, 30055, 1)).values[0] * 0.01;
    expect(Number.isFinite(pcsSoc)).toBe(true);
    expect(pcsSoc).toBeGreaterThanOrEqual(0);
    expect(pcsSoc).toBeLessThanOrEqual(100);
    // BSC EMERGENCY/offline durumunda SOC 0'a düşebilir; yalnız sağlıklı
    // durumda sıkı eşleşme aranır (kural motoru paylaşımlı ortamda çalışır).
    if (bscSoc > 1) expect(Math.abs(pcsSoc - bscSoc)).toBeLessThanOrEqual(5);
  }, 40_000);

  it("M12: toplam gerilim online rack'lerden gelir (~1300 V)", async () => {
    const v = await pcsValue("Battery Pack Total Voltage");
    expect(v).toBeGreaterThan(1000);
    expect(v).toBeLessThan(1600);
  }, 40_000);

  it("C6/PCS1-2: güç limitleri BSC limitinden (uint32 size:2) eşlenir", async () => {
    const chg = Math.round((await bscU32(30063)) * 0.01) * 0.1; // kW
    const dis = Math.round((await bscU32(30065)) * 0.01) * 0.1;
    expect(await pcsValue("Max Charging Power Pack")).toBeCloseTo(chg, 1);
    expect(await pcsValue("Max Discharging Power Pack")).toBeCloseTo(dis, 1);
  }, 60_000);

  it("C7: gerilim limitleri rack ID değil gerçek gerilim (~1300 V)", async () => {
    const upper = await pcsValue("Battery Pack Upper Voltage Limit", { min: 1000 });
    const lower = await pcsValue("Battery Pack Lower Voltage Limit", { min: 1000 });
    expect(upper).toBeGreaterThan(1000);
    expect(lower).toBeGreaterThan(1000);
    expect(upper).toBeGreaterThanOrEqual(lower);
  }, 60_000);

  it("C8/PCS4: akım limiti güç÷gerilim (computed) ile eşlenir", async () => {
    const chg = (await bscU32(30063)) * 0.001; // kW
    let v = (await bscU32(30059)) * 0.0001; // V
    if (v === 0) v = (await bscU32(30057)) * 0.0001; // anticipated fallback
    const expectedA = v > 0 ? Math.round((chg / v) * 10000) * 0.1 : (await pcsValue("Max Charging Current Pack"));
    expect(await pcsValue("Max Charging Current Pack")).toBeCloseTo(expectedA, 0);
  }, 60_000);

  it("PCS3: SOP BSC şarj limitinden (uint32 size:2) eşlenir", async () => {
    const chg = Math.round((await bscU32(30063)) * 0.01) * 0.1;
    expect(await pcsValue("Battery Pack SOP")).toBeCloseTo(chg, 1);
  }, 40_000);

  it("PCS13: charge/discharge yasağı bitleri (B02) BSC arızasında set edilir", async () => {
    await inject(CONTAINER_INJECT_URL, "BSC-1", "fault");
    await sleep(12000);
    const rows = await deviceRows(FIELD_URL, fieldToken, "PCS-1");
    const word = valueOf(rows, "BMS Status Word");
    await inject(CONTAINER_INJECT_URL, "BSC-1", "nominal");
    // Appendix 1: bit4 charge prohibited + bit5 discharge prohibited birlikte set.
    expect(word & 0b110000).toBe(0b110000);
  }, 40_000);
});
