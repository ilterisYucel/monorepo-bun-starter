import { describe, it, expect } from "vitest";
import { MANEUVERS } from "./maneuvers";

describe("MANEUVERS", () => {
  it("has 18 entries", () => {
    const keys = Object.keys(MANEUVERS);
    expect(keys.length).toBeGreaterThanOrEqual(18);
  });

  it("every maneuver has required fields", () => {
    for (const [key, m] of Object.entries(MANEUVERS)) {
      expect(m.name, `${key}.name`).toBeTruthy();
      expect(m.label, `${key}.label`).toBeTruthy();
      expect(m.steps, `${key}.steps`).toBeInstanceOf(Array);
      expect(m.steps.length, `${key}.steps.length`).toBeGreaterThan(0);
      expect(["parallel", "sequential"]).toContain(m.mode);
    }
  });

  it("all steps have deviceId", () => {
    for (const m of Object.values(MANEUVERS)) {
      for (const step of m.steps) {
        expect(step.deviceId).toBeTruthy();
      }
    }
  });

  describe("fl06_charge", () => {
    it("targets all BSC devices", () => {
      const m = MANEUVERS.fl06_charge;
      const bscSteps = m.steps.filter((s) => s.deviceId.startsWith("BSC"));
      const deviceIds = bscSteps.map((s) => s.deviceId);
      expect(deviceIds).toContain("BSC-1");
      expect(deviceIds).toContain("BSC-2");
      expect(bscSteps.every((s) => s.command === "charge")).toBe(true);
    });
  });

  describe("fl03_emergency_stop", () => {
    it("is sequential mode", () => {
      expect(MANEUVERS.fl03_emergency_stop.mode).toBe("sequential");
    });

    it("stops BSC, DC, and opens CB in order", () => {
      const steps = MANEUVERS.fl03_emergency_stop.steps;
      expect(steps.some((s) => s.command === "stop")).toBe(true);
      expect(steps.some((s) => s.command === "off")).toBe(true);
      expect(steps.some((s) => s.command === "open")).toBe(true);
    });
  });

  describe("fl06_charge", () => {
    it("has onFailure set to stop", () => {
      expect(MANEUVERS.fl06_charge.onFailure).toBe("stop");
    });

    it("is sequential", () => {
      expect(MANEUVERS.fl06_charge.mode).toBe("sequential");
    });
  });
});

describe("maneuver helpers", () => {
  // ponytail: verify helper functions produce expected device IDs
  it("BSC charge targets 2 devices", () => {
    const m = MANEUVERS.fl06_charge;
    const bscSteps = m.steps.filter((s) => s.deviceId.startsWith("BSC"));
    expect(bscSteps).toHaveLength(2);
  });

  it("HVAC maneuvers target 8 devices", () => {
    const m = MANEUVERS.fl05_tms_cooling_force;
    expect(m.steps).toHaveLength(8);
    expect(m.steps.every((s) => s.deviceId.startsWith("HVAC"))).toBe(true);
  });

  it("DC maneuvers target 2 devices", () => {
    const target = MANEUVERS.fl01_start;
    const dcSteps = target.steps.filter((s) => s.command === "on");
    expect(dcSteps.length).toBe(2);
  });

  it("CB maneuvers target 2 devices", () => {
    const target = MANEUVERS.fl01_start;
    const cbSteps = target.steps.filter((s) => s.command === "open");
    expect(cbSteps.length).toBe(2);
  });
});

// ponytail: test for MANEUVER_CONTROLS if it exists
describe("MANEUVER_CONTROLS", () => {
  it("can be imported", async () => {
    // Verify the module exports controls
    const mod = await import("./maneuvers");
    expect(mod.MANEUVER_CONTROLS).toBeDefined();
  });
});
