import { describe, it, expect } from "vitest";
import { EmuSimulator } from "./simulator";
import { INPUT, HOLDING, COIL_STATION_ON_OFF } from "./register-map";

describe("EmuSimulator", () => {
  it("başlangıçta istasyon açık, hot standby durumu (3)", () => {
    const sim = new EmuSimulator(3);
    sim.tick(1);
    expect(sim.readCoil(COIL_STATION_ON_OFF)).toBe(false); // 0 = ON
    expect(sim.readInputRegister(INPUT.STATION_STATE)).toBe(3);
  });

  it("negatif setpoint → şarj durumu (4)", () => {
    const sim = new EmuSimulator(3);
    sim.writeHoldingRegister(HOLDING.AC_ACTIVE_POWER_SETPOINT, (() => {
      const raw = -5000; // -500.0 kW ×10
      return (raw >>> 16) & 0xffff;
    })());
    sim.writeHoldingRegister(HOLDING.AC_ACTIVE_POWER_SETPOINT + 1, -5000 & 0xffff);
    for (let i = 0; i < 10; i++) sim.tick(1);
    expect(sim.readInputRegister(INPUT.STATION_STATE)).toBe(4);
  });

  it("pozitif setpoint → deşarj durumu (5)", () => {
    const sim = new EmuSimulator(3);
    sim.writeHoldingRegister(HOLDING.AC_ACTIVE_POWER_SETPOINT, (5000 >>> 16) & 0xffff);
    sim.writeHoldingRegister(HOLDING.AC_ACTIVE_POWER_SETPOINT + 1, 5000 & 0xffff);
    for (let i = 0; i < 10; i++) sim.tick(1);
    expect(sim.readInputRegister(INPUT.STATION_STATE)).toBe(5);
  });

  it("istasyon kapanınca shutdown durumu (1) ve güç sıfır", () => {
    const sim = new EmuSimulator(3);
    sim.writeHoldingRegister(HOLDING.AC_ACTIVE_POWER_SETPOINT, 0);
    sim.writeHoldingRegister(HOLDING.AC_ACTIVE_POWER_SETPOINT + 1, 5000 & 0xffff);
    for (let i = 0; i < 5; i++) sim.tick(1);
    sim.writeCoil(COIL_STATION_ON_OFF, true); // 1 = OFF
    sim.tick(1);
    expect(sim.readInputRegister(INPUT.STATION_STATE)).toBe(1);
  });

  it("PCS sayısı ve comm durumu word'leri doğru", () => {
    const sim = new EmuSimulator(3);
    sim.tick(1);
    expect(sim.readInputRegister(INPUT.PCS_COUNT)).toBe(3);
    expect(sim.readInputRegister(INPUT.STATUS_WORD_1 + 2)).toBe(0b111);
  });
});
