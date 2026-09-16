import { describe, it, expect, beforeEach } from "vitest";
import { FssSimulator } from "./index";
import { DISCRETE } from "./register-map";

describe("FssSimulator (FL-01/FL-06 FSS availability)", () => {
  let sim: FssSimulator;

  beforeEach(() => {
    sim = new FssSimulator();
  });

  describe("initial state", () => {
    it("başlangıçta sağlıklı: System OK true, Fault false, Discharged false", () => {
      expect(sim.readDiscreteInput(DISCRETE.SYSTEM_OK)).toBe(true);
      expect(sim.readDiscreteInput(DISCRETE.FAULT)).toBe(false);
      expect(sim.readDiscreteInput(DISCRETE.DISCHARGED)).toBe(false);
    });
  });

  describe("fault enjeksiyonu (demo senaryo API)", () => {
    it("setFault(true) → Fault true, System OK false", () => {
      sim.setFault(true);
      expect(sim.readDiscreteInput(DISCRETE.FAULT)).toBe(true);
      expect(sim.readDiscreteInput(DISCRETE.SYSTEM_OK)).toBe(false);
    });

    it("setFault(false) → sağlığa döner", () => {
      sim.setFault(true);
      sim.setFault(false);
      expect(sim.readDiscreteInput(DISCRETE.SYSTEM_OK)).toBe(true);
      expect(sim.readDiscreteInput(DISCRETE.FAULT)).toBe(false);
    });

    it("setDischarged(true) → Discharged true", () => {
      sim.setDischarged(true);
      expect(sim.readDiscreteInput(DISCRETE.DISCHARGED)).toBe(true);
    });
  });

  describe("okuma sınırları", () => {
    it("tick durumu bozmaz", () => {
      sim.tick(1);
      expect(sim.readDiscreteInput(DISCRETE.SYSTEM_OK)).toBe(true);
    });

    it("bilinmeyen adres false döner", () => {
      expect(sim.readDiscreteInput(99)).toBe(false);
    });
  });
});
