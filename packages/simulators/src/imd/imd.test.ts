import { describe, it, expect, beforeEach } from "vitest";
import { ImdSimulator } from "./index";
import { INPUT } from "./register-map";

describe("ImdSimulator (FL-11 izolasyon izleme)", () => {
  let sim: ImdSimulator;

  beforeEach(() => {
    sim = new ImdSimulator();
    sim.tick(1);
  });

  describe("initial state", () => {
    it("başlangıçta sağlıklı: Status bit0=1 (OK)", () => {
      const status = sim.readInputRegister(INPUT.STATUS);
      expect(status & 0x0001).toBe(1);
    });

    it("izolasyon direnci 1000 kΩ civarı", () => {
      const r = sim.readInputRegister(INPUT.INSULATION_RESISTANCE) as number;
      expect(r).toBeGreaterThanOrEqual(950);
      expect(r).toBeLessThanOrEqual(1050);
    });
  });

  describe("fault enjeksiyonu (demo senaryo API)", () => {
    it("setFault(true) → Status bit1 set, bit0 temiz", () => {
      sim.setFault(true);
      sim.tick(1);
      const status = sim.readInputRegister(INPUT.STATUS) as number;
      expect(status & 0x0002).toBe(2);
      expect(status & 0x0001).toBe(0);
    });

    it("setFault(false) → OK geri döner", () => {
      sim.setFault(true);
      sim.tick(1);
      sim.setFault(false);
      sim.tick(1);
      expect(sim.readInputRegister(INPUT.STATUS) & 0x0001).toBe(1);
    });

    it("fault'ta izolasyon direnci düşer (eşik altı)", () => {
      sim.setFault(true);
      sim.tick(1);
      const r = sim.readInputRegister(INPUT.INSULATION_RESISTANCE) as number;
      expect(r).toBeLessThan(500);
    });
  });

  describe("okuma sınırları", () => {
    it("bilinmeyen adres 0 döner", () => {
      expect(sim.readInputRegister(99)).toBe(0);
    });
  });
});
