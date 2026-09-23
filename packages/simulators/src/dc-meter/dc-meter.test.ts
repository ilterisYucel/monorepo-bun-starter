import { describe, it, expect, beforeEach } from "vitest";
import { DcMeterSimulator, DcMeterAdapter } from "./index";
import { INPUT } from "./register-map";

/** float32 → BE kelime çifti (test beklentisi üreticisi). */
function floatWords(value: number): [number, number] {
  const buf = new ArrayBuffer(4);
  const view = new DataView(buf);
  view.setFloat32(0, value, false); // big-endian
  return [view.getUint16(0), view.getUint16(2)];
}

describe("DcMeterSimulator (FL-08 DC kısa devre koruması)", () => {
  let sim: DcMeterSimulator;

  beforeEach(() => {
    sim = new DcMeterSimulator();
    sim.tick(1);
  });

  describe("başlangıç durumu (nominal)", () => {
    it("DC Voltage 750.0 V — FLOAT32 BE kelime çifti", () => {
      const [hi, lo] = floatWords(750.0);
      expect(sim.readInputRegister(INPUT.DC_VOLTAGE)).toBe(hi);
      expect(sim.readInputRegister(INPUT.DC_VOLTAGE + 1)).toBe(lo);
    });

    it("DC Current 100.0 A — FLOAT32 BE kelime çifti", () => {
      const [hi, lo] = floatWords(100.0);
      expect(sim.readInputRegister(INPUT.DC_CURRENT)).toBe(hi);
      expect(sim.readInputRegister(INPUT.DC_CURRENT + 1)).toBe(lo);
    });

    it("DC Power 75.0 kW — FLOAT32 BE kelime çifti", () => {
      const [hi, lo] = floatWords(75.0);
      expect(sim.readInputRegister(INPUT.DC_POWER)).toBe(hi);
      expect(sim.readInputRegister(INPUT.DC_POWER + 1)).toBe(lo);
    });

    it("Alarm Word 0 (normal çalışma)", () => {
      expect(sim.readInputRegister(INPUT.ALARM_WORD)).toBe(0);
    });
  });

  describe("ölçüm enjeksiyonu (FL-08 eşik senaryosu)", () => {
    it("setMeasurements voltage 1600 → eşik üstü değer okunur", () => {
      sim.setMeasurements({ voltage: 1600 });
      const [hi, lo] = floatWords(1600.0);
      expect(sim.readInputRegister(INPUT.DC_VOLTAGE)).toBe(hi);
      expect(sim.readInputRegister(INPUT.DC_VOLTAGE + 1)).toBe(lo);
    });

    it("yalnızca verilen alanlar değişir — diğerleri nominal kalır", () => {
      sim.setMeasurements({ voltage: 1600 });
      const [, loPower] = floatWords(75.0);
      expect(sim.readInputRegister(INPUT.DC_POWER + 1)).toBe(loPower);
      const [, loCurrent] = floatWords(100.0);
      expect(sim.readInputRegister(INPUT.DC_CURRENT + 1)).toBe(loCurrent);
    });

    it("current/power ayrı ayrı enjekte edilebilir (1680 A / 1784 kW senaryoları)", () => {
      sim.setMeasurements({ current: 1700 });
      const [hi, lo] = floatWords(1700.0);
      expect(sim.readInputRegister(INPUT.DC_CURRENT)).toBe(hi);
      expect(sim.readInputRegister(INPUT.DC_CURRENT + 1)).toBe(lo);

      sim.setMeasurements({ power: 1800 });
      const [hiP, loP] = floatWords(1800.0);
      expect(sim.readInputRegister(INPUT.DC_POWER)).toBe(hiP);
      expect(sim.readInputRegister(INPUT.DC_POWER + 1)).toBe(loP);
    });

    it("alarm word ham değer olarak enjekte edilebilir", () => {
      sim.setMeasurements({ alarmWord: 0x0001 });
      expect(sim.readInputRegister(INPUT.ALARM_WORD)).toBe(0x0001);
    });
  });

  describe("okuma sınırları", () => {
    it("bilinmeyen adres 0 döner", () => {
      expect(sim.readInputRegister(99)).toBe(0);
    });
  });
});

describe("DcMeterAdapter (salt okuma sözleşmesi)", () => {
  let adapter: DcMeterAdapter;

  beforeEach(() => {
    adapter = new DcMeterAdapter(new DcMeterSimulator());
  });

  it("readInputRegisters ardışık kelimeler döner (float çifti)", async () => {
    const words = await adapter.readInputRegisters(INPUT.DC_VOLTAGE, 2);
    const [hi, lo] = floatWords(750.0);
    expect(words).toEqual([hi, lo]);
  });

  it("holding register 0 döner — komut YOKTUR", async () => {
    expect(await adapter.readHoldingRegister(INPUT.DC_VOLTAGE)).toBe(0);
  });

  it("coil/discrete okumaları boş — I/O YOKTUR", async () => {
    expect(await adapter.readCoil(0)).toBe(false);
    expect(await adapter.readDiscreteInput(0)).toBe(false);
  });
});
