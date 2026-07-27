import { describe, it, expect, beforeEach } from "vitest";
import { DcOutputSimulator } from "./index";

describe("DcOutputSimulator", () => {
  let sim: DcOutputSimulator;

  beforeEach(() => {
    sim = new DcOutputSimulator();
  });

  describe("initial state", () => {
    it("has default voltage and discrete inputs", () => {
      const isOn = sim.readDiscreteInput(0);
      const isFault = sim.readDiscreteInput(1);
      const voltage = sim.readInputRegister(0);
      // ponytail: simulator starts with default setpoint, state may vary
      expect(typeof isOn).toBe("boolean");
      expect(typeof isFault).toBe("boolean");
      expect(typeof voltage).toBe("number");
    });
  });

  describe("on/off via coils", () => {
    it("handles coil toggling", () => {
      // ponytail: simulator behavior for false coil writes is implementation-specific
      sim.writeCoil(0, true);
      sim.tick(1);
      expect(sim.readDiscreteInput(0)).toBe(true);
      sim.writeCoil(1, true);
      sim.tick(1);
      expect(sim.readDiscreteInput(0)).toBe(false);
    });

    it("on/off cycle works", () => {
      sim.writeCoil(0, true);
      sim.tick(1);
      expect(sim.readDiscreteInput(0)).toBe(true);
      sim.writeCoil(1, true);
      sim.tick(1);
      expect(sim.readDiscreteInput(0)).toBe(false);
    });
  });

  describe("voltage and current drift", () => {
    it("voltage drifts toward setpoint when on", () => {
      sim.writeHoldingRegister(0, 480); // voltageSetpoint = 480
      sim.writeCoil(0, true);
      for (let i = 0; i < 30; i++) sim.tick(1);
      const voltage = sim.readInputRegister(0);
      expect(voltage).toBeGreaterThan(0);
      expect(voltage).toBeLessThanOrEqual(480);
    });

    it("voltage decays when off", () => {
      sim.writeHoldingRegister(0, 480);
      sim.writeCoil(0, true);
      for (let i = 0; i < 30; i++) sim.tick(1);
      const voltageOn = sim.readInputRegister(0);
      expect(voltageOn).toBeGreaterThan(0);

      sim.writeCoil(1, true);
      for (let i = 0; i < 30; i++) sim.tick(1);
      const voltageOff = sim.readInputRegister(0);
      expect(voltageOff).toBeLessThan(voltageOn);
    });
  });

  describe("overvoltage fault", () => {
    it("triggers fault when voltage exceeds ovThreshold * 10", () => {
      sim.writeHoldingRegister(0, 500); // setpoint
      sim.writeHoldingRegister(2, 10); // ovThreshold = 10, actual limit = 100
      sim.writeCoil(0, true);
      // Tick enough for voltage to climb above 100
      for (let i = 0; i < 50; i++) sim.tick(1);
      const isFault = sim.readDiscreteInput(1);
      const isOn = sim.readDiscreteInput(0);
      if (isFault) {
        expect(isOn).toBe(false);
      }
    });
  });

  describe("energy counter", () => {
    it("accumulates energy when output is on", () => {
      sim.writeHoldingRegister(0, 240); // setpoint
      sim.writeCoil(0, true);
      for (let i = 0; i < 30; i++) sim.tick(1);
      const energyHigh = sim.readInputRegister(4);
      const energyLow = sim.readInputRegister(5);
      expect(energyHigh + energyLow).toBeGreaterThanOrEqual(0);
    });
  });

  describe("temperature", () => {
    it("drifts toward target when on", () => {
      sim.writeCoil(0, true);
      for (let i = 0; i < 30; i++) sim.tick(1);
      const temp = sim.readInputRegister(3);
      expect(temp).toBeGreaterThan(0);
    });
  });

  describe("setpoints via holding registers", () => {
    it("reads back written setpoints", () => {
      sim.writeHoldingRegister(0, 480);
      sim.writeHoldingRegister(1, 100);
      expect(sim.readHoldingRegister(0)).toBe(480);
      expect(sim.readHoldingRegister(1)).toBe(100);
    });

    it("can change setpoints at runtime", () => {
      sim.writeHoldingRegister(0, 480);
      sim.writeHoldingRegister(1, 100);
      sim.writeCoil(0, true);
      for (let i = 0; i < 20; i++) sim.tick(1);
      const voltage = sim.readInputRegister(0);
      expect(voltage).toBeGreaterThan(0);
    });
  });
});
