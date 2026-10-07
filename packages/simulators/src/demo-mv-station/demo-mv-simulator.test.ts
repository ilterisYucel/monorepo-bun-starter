import { describe, it, expect, beforeEach } from "vitest";
import { DemoMvStationSimulator } from "./demo-mv-simulator";
import { COILS, INPUT_REGS } from "./register-map";

describe("DemoMvStationSimulator (SPEC UC-9 / T-38)", () => {
  let sim: DemoMvStationSimulator;
  beforeEach(() => {
    sim = new DemoMvStationSimulator();
  });

  it("başlangıç: kesiciler kapalı, topraklar açık (AK-9.1)", () => {
    expect(sim.cellPosition("H01")).toBe(true);
    expect(sim.cellPosition("H05")).toBe(true);
    expect(sim.earthClosed("H05")).toBe(false);
    expect(sim.readInputRegister(INPUT_REGS.KV_X10)).toBe(345);
    expect(sim.readInputRegister(INPUT_REGS.HZ_X100)).toBe(5000);
  });

  it("kesici kapalıyken toprak kapanmaz (AK-9.2)", () => {
    sim.writeCoil(COILS.H05_ES_CLOSE, true);
    expect(sim.earthClosed("H05")).toBe(false);
  });

  it("kesici açıkken toprak kapanır, sonra kesici kapanmaz", () => {
    sim.writeCoil(COILS.H05_OPEN, true);
    sim.writeCoil(COILS.H05_ES_CLOSE, true);
    expect(sim.earthClosed("H05")).toBe(true);
    sim.writeCoil(COILS.H05_CLOSE, true);
    expect(sim.cellPosition("H05")).toBe(false);
  });

  it("H01 toprak ayırıcısı her zaman kilitli", () => {
    sim.writeCoil(COILS.H01_OPEN, true);
    sim.writeCoil(COILS.H01_ES_CLOSE, true);
    expect(sim.earthClosed("H01")).toBe(false);
  });

  it("toprak açma serbest", () => {
    sim.writeCoil(COILS.H04_OPEN, true);
    sim.writeCoil(COILS.H04_ES_CLOSE, true);
    expect(sim.earthClosed("H04")).toBe(true);
    sim.writeCoil(COILS.H04_ES_OPEN, true);
    expect(sim.earthClosed("H04")).toBe(false);
  });
});
