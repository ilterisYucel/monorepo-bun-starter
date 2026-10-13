import { describe, it, expect, beforeEach } from "vitest";
import { ImdSimulator, ImdAdapter } from "./index";
import { INPUT } from "./register-map";

/**
 * IMD sözleşmesi — isoPV1685RTU GERÇEK register map (K4):
 * docs/devices/isoPV1685RTU_D00007_A_XXEN_Modbus.pdf §3.
 * Direnç Ω cinsinden UInt32 (2 kelime BE); Alarm/Prewarning 0-OK/4-Warning;
 * Device error 0 yok / >0 kod. FL-11 kuralı Alarm + Device Error bitleriyle.
 */
describe("ImdSimulator (FL-11 toprak direnci — gerçek map, K4)", () => {
  let sim: ImdSimulator;

  beforeEach(() => {
    sim = new ImdSimulator();
    sim.tick(1);
  });

  describe("başlangıç durumu (sağlıklı)", () => {
    it("izolasyon direnci ~1 MΩ (Ω cinsinden UInt32 BE)", () => {
      const hi = sim.readInputRegister(INPUT.INSULATION_RESISTANCE) as number;
      const lo = sim.readInputRegister(INPUT.INSULATION_RESISTANCE + 1) as number;
      const resistance = hi * 0x10000 + lo;
      expect(resistance).toBeGreaterThanOrEqual(950_000);
      expect(resistance).toBeLessThanOrEqual(1_050_000);
    });

    it("Insulation Alarm 0 (OK)", () => {
      expect(sim.readInputRegister(INPUT.ALARM)).toBe(0);
    });

    it("Insulation Prewarning 0 (OK)", () => {
      expect(sim.readInputRegister(INPUT.PREWARNING)).toBe(0);
    });

    it("Device Error 0 (hata yok)", () => {
      expect(sim.readInputRegister(INPUT.DEVICE_ERROR)).toBe(0);
    });
  });

  describe("izolasyon arızası enjeksiyonu (FL-11 senaryosu)", () => {
    it("setFault(true) → Alarm 4 (Warning), direnç eşik altına düşer", () => {
      sim.setFault(true);
      sim.tick(1);
      expect(sim.readInputRegister(INPUT.ALARM)).toBe(4);
      const hi = sim.readInputRegister(INPUT.INSULATION_RESISTANCE) as number;
      const lo = sim.readInputRegister(INPUT.INSULATION_RESISTANCE + 1) as number;
      expect(hi * 0x10000 + lo).toBeLessThan(100_000);
    });

    it("setFault(true) → Prewarning 4 (Warning)", () => {
      sim.setFault(true);
      sim.tick(1);
      expect(sim.readInputRegister(INPUT.PREWARNING)).toBe(4);
    });

    it("setFault(false) → Alarm 0'a döner, direnç sağlıklı seviyeye", () => {
      sim.setFault(true);
      sim.tick(1);
      sim.setFault(false);
      sim.tick(1);
      expect(sim.readInputRegister(INPUT.ALARM)).toBe(0);
    });
  });

  describe("cihaz hatası enjeksiyonu (Device Error)", () => {
    it("setDeviceError(1) → Device Error register'ı kod taşır", () => {
      sim.setDeviceError(1);
      expect(sim.readInputRegister(INPUT.DEVICE_ERROR)).toBe(1);
    });

    it("setDeviceError(0) → temizlenir", () => {
      sim.setDeviceError(1);
      sim.setDeviceError(0);
      expect(sim.readInputRegister(INPUT.DEVICE_ERROR)).toBe(0);
    });
  });

  describe("okuma sınırları", () => {
    it("bilinmeyen adres 0 döner", () => {
      expect(sim.readInputRegister(999)).toBe(0);
    });
  });

  describe("ImdAdapter — FC03 holding okuma (doküman D00007)", () => {
    it("readHoldingRegisters ölçüm değerini döner (FC03 zorunlu)", async () => {
      const sim = new ImdSimulator();
      sim.tick(1);
      const adapter = new ImdAdapter(sim);
      const hi = sim.readInputRegister(INPUT.INSULATION_RESISTANCE) as number;
      expect(await adapter.readHoldingRegister(INPUT.INSULATION_RESISTANCE)).toBe(hi);
    });
  });
});

describe("ImdSimulator — LGES eşikleri (F2.6): 225 kΩ uyarı / 150 kΩ arıza", () => {
  it("200 kΩ → yalnız Prewarning; Insulation Alarm 0", () => {
    const sim = new ImdSimulator();
    expect(sim.inject("warning")).toBe(true);
    sim.tick(1);
    expect(sim.readInputRegister(INPUT.PREWARNING)).not.toBe(0);
    expect(sim.readInputRegister(INPUT.ALARM)).toBe(0);
  });

  it("100 kΩ (fault) → Insulation Alarm aktif", () => {
    const sim = new ImdSimulator();
    expect(sim.inject("fault")).toBe(true);
    sim.tick(1);
    expect(sim.readInputRegister(INPUT.ALARM)).not.toBe(0);
  });

  it("healthy → temiz (uyarı/arıza 0)", () => {
    const sim = new ImdSimulator();
    sim.inject("fault");
    sim.tick(1);
    sim.inject("healthy");
    sim.tick(1);
    expect(sim.readInputRegister(INPUT.ALARM)).toBe(0);
    expect(sim.readInputRegister(INPUT.PREWARNING)).toBe(0);
  });
});
