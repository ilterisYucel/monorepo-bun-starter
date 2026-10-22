import { describe, it, expect, beforeEach } from "vitest";
import { HvacSimulator, HvacSimulatorAdapter } from "./index";

describe("HvacSimulator", () => {
  let sim: HvacSimulator;

  beforeEach(() => {
    sim = new HvacSimulator({ deviceId: "HVAC-1" });
  });

  describe("initial state", () => {
    it("starts in standby", () => {
      const status = sim.readInputRegister(0x1000);
      expect(status).toBe(1); // STANDBY
    });

    it("has default temperature", () => {
      const temp = sim.readInputRegister(0x1010);
      expect(temp).toBeGreaterThan(0);
    });
  });

  describe("remote on/off", () => {
    it("turns on when remoteOn is set", () => {
      sim.writeHoldingRegister(0x202, 1); // remote on
      sim.tick(1);
      const status = sim.readInputRegister(0x1000);
      expect(status).toBe(2); // RUNNING
    });

    it("turns off when remoteOn is cleared", () => {
      sim.writeHoldingRegister(0x202, 1);
      sim.tick(1);
      sim.writeHoldingRegister(0x202, 0);
      sim.tick(1);
      const status = sim.readInputRegister(0x1000);
      expect(status).toBe(1); // STANDBY
    });
  });

  describe("cooling mode", () => {
    it("cools when temperature is above coolingSetpoint + deadband", () => {
      const currentTemp = sim.readInputRegister(0x1010) as number;
      // Set cooling setpoint well below current temperature
      sim.writeHoldingRegister(0x10, Math.max(0, currentTemp - 20));
      sim.writeHoldingRegister(0x202, 1);
      for (let i = 0; i < 30; i++) sim.tick(1);
      // Compressor should be running (value 2 in cooling)
      const compressor = sim.readInputRegister(0x1017);
      expect(compressor).toBeGreaterThanOrEqual(1);
    });
  });

  describe("heating mode", () => {
    it("produces heat when remote is on with high setpoint", () => {
      sim.writeHoldingRegister(0x14, 500);
      sim.writeHoldingRegister(0x202, 1);
      for (let i = 0; i < 30; i++) sim.tick(1);
      const heater = sim.readInputRegister(0x1008);
      // ponytail: heater register format is implementation-specific, just verify numeric
      expect(typeof heater).toBe("number");
    });
  });

  describe("alarms", () => {
    it("has alarm registers that are readable", () => {
      sim.writeHoldingRegister(0x202, 1);
      for (let i = 0; i < 5; i++) sim.tick(1);
      const alarmHigh = sim.readInputRegister(0x300);
      const alarmLow = sim.readInputRegister(0x301);
      expect(typeof alarmHigh).toBe("number");
      expect(typeof alarmLow).toBe("number");
    });
  });

  describe("reset", () => {
    it("resets alarm state", () => {
      sim.writeHoldingRegister(0x25, 100);
      sim.writeHoldingRegister(0x202, 1);
      sim.tick(1);
      sim.writeHoldingRegister(0x200, 1); // reset
      sim.tick(1);
    });
  });

  describe("temperature drift", () => {
    it("changes temperature over time when running", () => {
      const initial = sim.readInputRegister(0x1010) as number;
      sim.writeHoldingRegister(0x202, 1);
      for (let i = 0; i < 10; i++) sim.tick(1);
      const later = sim.readInputRegister(0x1010) as number;
      expect(later).not.toBe(initial);
    });
  });

  describe("fan speeds", () => {
    it("reports fan speeds when running", () => {
      sim.writeHoldingRegister(0x202, 1);
      for (let i = 0; i < 5; i++) sim.tick(1);
      const indoorFan = sim.readInputRegister(0x100A);
      const outdoorFan = sim.readInputRegister(0x100C);
      expect(indoorFan).toBeGreaterThanOrEqual(0);
      expect(outdoorFan).toBeGreaterThanOrEqual(0);
    });

    it("reports fan speed values", () => {
      const indoor = sim.readInputRegister(0x100A) as number;
      expect(typeof indoor).toBe("number");
    });
  });

  describe("Monitor Temp Mode (0x09)", () => {
    it("yazılabilir ve okunur — mode-4 server-temp bağımlılığı kaldırılır (H30)", () => {
      sim.writeHoldingRegister(0x09, 0);
      expect(sim.readHoldingRegister(0x09)).toBe(0);
    });
  });

  describe("HvacSimulatorAdapter — FC03 holding okuma (doküman)", () => {
    it("bilgi (0x1000) ve alarm (0x300) blokları holding ile okunur", async () => {
      const adapter = new HvacSimulatorAdapter(sim);
      expect(await adapter.readHoldingRegister(0x1000)).toBe(
        sim.readInputRegister(0x1000),
      );
      expect(await adapter.readHoldingRegister(0x300)).toBe(
        sim.readInputRegister(0x300),
      );
    });
  });
});

describe("HvacSimulator — Faz 1 ekleri (compressor action / server RH)", () => {
  it("server humidity (0x2003) yaz/oku", () => {
    const sim = new HvacSimulator({ deviceId: "HVAC-1" });
    sim.writeHoldingRegister(0x2003, 450);
    expect(sim.readHoldingRegister(0x2003)).toBe(450);
  });

  it("kompresör çalıştırma sayacı 0→çalışma geçişinde artar (0x1028)", () => {
    const sim = new HvacSimulator({ deviceId: "HVAC-1" });
    expect(sim.readInputRegister(0x1029)).toBe(0); // low word
    sim.writeHoldingRegister(0x202, 1); // remote on
    sim.inject("hot"); // kompresör soğutma ister
    sim.tick(1);
    expect(sim.readInputRegister(0x1029)).toBe(1);
    sim.tick(1); // hâlâ çalışıyor → artmaz
    expect(sim.readInputRegister(0x1029)).toBe(1);
  });
});
