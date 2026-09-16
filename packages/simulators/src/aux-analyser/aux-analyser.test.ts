import { describe, it, expect, beforeEach } from "vitest";
import { AuxAnalyserSimulator } from "./index";
import { INPUT } from "./register-map";

describe("AuxAnalyserSimulator (FL-02 AUX Kaybı)", () => {
  let sim: AuxAnalyserSimulator;

  beforeEach(() => {
    sim = new AuxAnalyserSimulator();
    sim.tick(1);
  });

  describe("initial state", () => {
    it("başlangıçta AUX OK (Energy Status bit0=1, bit1=0)", () => {
      const status = sim.readInputRegister(INPUT.ENERGY_STATUS);
      expect(status & 0x0001).toBe(1);
      expect(status & 0x0002).toBe(0);
    });

    it("nominal voltaj 230.0V civarı (0.1 ölçekli)", () => {
      const v = sim.readInputRegister(INPUT.AUX_VOLTAGE) as number;
      expect(v).toBeGreaterThanOrEqual(2280);
      expect(v).toBeLessThanOrEqual(2320);
    });

    it("nominal frekans 50.00Hz civarı (0.01 ölçekli)", () => {
      const f = sim.readInputRegister(INPUT.AUX_FREQUENCY) as number;
      expect(f).toBeGreaterThanOrEqual(4990);
      expect(f).toBeLessThanOrEqual(5010);
    });

    it("akım pozitif değer okur", () => {
      expect(sim.readInputRegister(INPUT.AUX_CURRENT)).toBeGreaterThan(0);
    });
  });

  describe("energy loss enjeksiyonu (demo senaryo API)", () => {
    it("setEnergyLoss(true) → Energy Status bit1 set", () => {
      sim.setEnergyLoss(true);
      sim.tick(1);
      const status = sim.readInputRegister(INPUT.ENERGY_STATUS) as number;
      expect(status & 0x0002).toBe(2);
    });

    it("setEnergyLoss(false) → AUX OK geri döner", () => {
      sim.setEnergyLoss(true);
      sim.tick(1);
      sim.setEnergyLoss(false);
      sim.tick(1);
      const status = sim.readInputRegister(INPUT.ENERGY_STATUS) as number;
      expect(status & 0x0001).toBe(1);
      expect(status & 0x0002).toBe(0);
    });

    it("enerji kaybında voltaj 0'a düşer", () => {
      sim.setEnergyLoss(true);
      sim.tick(1);
      expect(sim.readInputRegister(INPUT.AUX_VOLTAGE)).toBe(0);
    });
  });

  describe("tick kararlılığı", () => {
    it("jitter nominal bant içinde kalır", () => {
      for (let i = 0; i < 50; i++) {
        sim.tick(1);
        const v = sim.readInputRegister(INPUT.AUX_VOLTAGE) as number;
        expect(v).toBeGreaterThanOrEqual(2280);
        expect(v).toBeLessThanOrEqual(2320);
      }
    });

    it("bilinmeyen adres 0 döner", () => {
      expect(sim.readInputRegister(99)).toBe(0);
    });
  });
});
