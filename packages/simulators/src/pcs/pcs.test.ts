import { describe, it, expect } from "vitest";
import { PcsSimulator } from "./simulator";
import { PCS_BASE, INPUT, HOLDING, COIL_ON_OFF } from "./register-map";

describe("PcsSimulator", () => {
  it("başlangıçta kapalıdır (coil=1), standby biti set", () => {
    const sim = new PcsSimulator();
    sim.tick(1);
    expect(sim.readCoil(COIL_ON_OFF)).toBe(true);
    expect(sim.readInputRegister(PCS_BASE + INPUT.STATUS_WORD_1) & (1 << 5)).not.toBe(0);
  });

  it("on + negatif setpoint → şarj durumu (status bit7)", () => {
    const sim = new PcsSimulator();
    sim.writeCoil(COIL_ON_OFF, false); // 0 = ON
    sim.writeHoldingRegister(PCS_BASE + HOLDING.AC_ACTIVE_POWER_SETPOINT, -500); // -50.0 kW
    for (let i = 0; i < 10; i++) sim.tick(1);

    const sw = sim.readInputRegister(PCS_BASE + INPUT.STATUS_WORD_1);
    expect(sw & (1 << 7)).not.toBe(0); // charge status
    expect(sw & (1 << 8)).toBe(0); // discharge status değil
    expect(sw & (1 << 1)).not.toBe(0); // PCS run
  });

  it("pozitif setpoint → deşarj durumu (status bit8)", () => {
    const sim = new PcsSimulator();
    sim.writeCoil(COIL_ON_OFF, false);
    sim.writeHoldingRegister(PCS_BASE + HOLDING.AC_ACTIVE_POWER_SETPOINT, 500);
    for (let i = 0; i < 10; i++) sim.tick(1);

    const sw = sim.readInputRegister(PCS_BASE + INPUT.STATUS_WORD_1);
    expect(sw & (1 << 8)).not.toBe(0);
    expect(sw & (1 << 7)).toBe(0);
  });

  it("32-bit kayıtlar hi/lo kelime olarak okunur (frekans)", () => {
    const sim = new PcsSimulator();
    sim.tick(1);
    const hi = sim.readInputRegister(PCS_BASE + INPUT.AC_FREQUENCY);
    const lo = sim.readInputRegister(PCS_BASE + INPUT.AC_FREQUENCY + 1);
    expect(((hi << 16) | lo) / 1000).toBeCloseTo(50, 2);
  });

  it("şarj sırasında toplam şarj enerjisi artar", () => {
    const sim = new PcsSimulator();
    sim.writeCoil(COIL_ON_OFF, false);
    sim.writeHoldingRegister(PCS_BASE + HOLDING.AC_ACTIVE_POWER_SETPOINT, -1000); // -100 kW
    for (let i = 0; i < 10; i++) sim.tick(1);
    const hi = sim.readInputRegister(PCS_BASE + INPUT.TOTAL_CHARGE_ENERGY);
    const lo = sim.readInputRegister(PCS_BASE + INPUT.TOTAL_CHARGE_ENERGY + 1);
    expect(((hi << 16) | lo) / 10).toBeGreaterThan(0);
  });
});
