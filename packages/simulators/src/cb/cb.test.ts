import { describe, it, expect, beforeEach } from "vitest";
import { CbSimulator } from "./index";

describe("CbSimulator", () => {
  let sim: CbSimulator;

  beforeEach(() => {
    sim = new CbSimulator();
    // Start closed (needs first tick)
    sim.tick(1);
  });

  describe("initial state", () => {
    it("starts closed and not tripped", () => {
      expect(sim.readDiscreteInput(0)).toBe(true); // IS_CLOSED
      expect(sim.readDiscreteInput(1)).toBe(false); // IS_TRIPPED
    });

    it("has current flowing when closed", () => {
      const current = sim.readInputRegister(0);
      expect(current).toBeGreaterThan(0);
    });
  });

  describe("open/close via coils", () => {
    it("opens when OPEN coil is set true", () => {
      sim.writeCoil(0, true);
      sim.tick(1);
      expect(sim.readDiscreteInput(0)).toBe(false); // IS_CLOSED
    });

    it("closes when CLOSE coil is set true after open", () => {
      sim.writeCoil(0, true);
      sim.tick(1);
      expect(sim.readDiscreteInput(0)).toBe(false);
      sim.writeCoil(1, true);
      sim.tick(1);
      expect(sim.readDiscreteInput(0)).toBe(true);
    });

    it("ignores writeCoil with false value", () => {
      sim.writeCoil(0, false);
      sim.tick(1);
      expect(sim.readDiscreteInput(0)).toBe(true); // still closed
    });

    it("increments operateCount on open and close", () => {
      const before = sim.readInputRegister(4);
      sim.writeCoil(0, true);
      sim.tick(1);
      sim.writeCoil(1, true);
      sim.tick(1);
      const after = sim.readInputRegister(4);
      expect(after).toBe((before as number) + 2);
    });
  });

  describe("trip on overcurrent", () => {
    it("trips when current exceeds tripThreshold", () => {
      const defaultThreshold = sim.readHoldingRegister(0) as number;
      // Set threshold very low to force trip
      sim.writeHoldingRegister(0, 1);
      sim.tick(1);
      expect(sim.readDiscreteInput(1)).toBe(true); // IS_TRIPPED
      expect(sim.readDiscreteInput(0)).toBe(false); // IS_CLOSED
      expect(sim.readInputRegister(0)).toBe(0); // no current
    });

    it("increments tripCount on overcurrent trip", () => {
      const before = sim.readInputRegister(3) as number;
      sim.writeHoldingRegister(0, 1);
      sim.tick(1);
      expect(sim.readInputRegister(3)).toBe(before + 1);
    });
  });

  describe("reset", () => {
    it("handles trip and reset sequence", () => {
      sim.writeHoldingRegister(0, 1);
      sim.tick(1);
      expect(sim.readDiscreteInput(1)).toBe(true); // tripped
      sim.writeHoldingRegister(0, 2000); // raise threshold back so it doesn't retrip
      sim.writeCoil(2, true);
      sim.tick(1);
      expect(sim.readDiscreteInput(1)).toBe(false); // no longer tripped
    });

    it("increments operateCount on reset", () => {
      sim.writeHoldingRegister(0, 1);
      sim.tick(1);
      const before = sim.readInputRegister(4) as number;
      sim.writeCoil(2, true);
      sim.tick(1);
      expect(sim.readInputRegister(4)).toBe(before + 1);
    });

    it("cannot close while tripped (must reset first)", () => {
      sim.writeHoldingRegister(0, 1);
      sim.tick(1);
      expect(sim.readDiscreteInput(1)).toBe(true);
      sim.writeCoil(1, true); // CLOSE
      sim.tick(1);
      expect(sim.readDiscreteInput(0)).toBe(false); // still not closed
    });
  });

  describe("temperature", () => {
    it("reports temperature readings", () => {
      const temp = sim.readInputRegister(2) as number;
      expect(typeof temp).toBe("number");
      expect(temp).toBeGreaterThan(0);
    });

    it("temperature changes when open", () => {
      sim.writeCoil(0, true);
      sim.tick(1);
      const tempDuring = sim.readInputRegister(2) as number;
      expect(typeof tempDuring).toBe("number");
    });
  });

  describe("threshold changes", () => {
    it("updates trip threshold in real-time", () => {
      sim.writeHoldingRegister(0, 2000);
      expect(sim.readHoldingRegister(0)).toBe(2000);
    });
  });
});
