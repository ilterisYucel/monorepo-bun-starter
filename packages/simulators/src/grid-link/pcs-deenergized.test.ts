import { describe, it, expect } from "vitest";
import { WattoxPcsSimulator } from "../wattox-pcs";
import { OP_STANDBY, REG_GRID_ACTIVE_POWER, REG_GRID_V_AB, REG_OP_STATUS, SET_ACTIVE_POWER, SET_COMMAND_SOURCE } from "../wattox-pcs/register-map";
import type { IGridLink } from "./bus";

/** PCS de-enerjili davranış (SEBEKE-YOLU-ESLESMESI UC-2). */
class StubLink implements IGridLink {
  energized = true;
  isEnergized(): boolean {
    return this.energized;
  }
}

const makePcs = (link: IGridLink): WattoxPcsSimulator => {
  const pcs = new WattoxPcsSimulator({ deviceId: "PCS-1", gridLink: link, gridFeeder: "H04" });
  pcs.writeSetting(SET_COMMAND_SOURCE, 1);
  pcs.writeSetting(SET_ACTIVE_POWER, (-300) & 0xffff);
  return pcs;
};

describe("WattoxPcsSimulator — şebeke yolu", () => {
  it("AK-2.1/2.2: kesici açılınca standby + güç 0 + Vac 0", () => {
    const link = new StubLink();
    const pcs = makePcs(link);
    pcs.tick(1);
    expect(pcs.readRegister(REG_GRID_ACTIVE_POWER)).toBe((-300) & 0xffff);

    link.energized = false;
    pcs.tick(1);
    expect(pcs.readRegister(REG_GRID_ACTIVE_POWER)).toBe(0);
    expect(pcs.readRegister(REG_GRID_V_AB)).toBe(0);
    expect(pcs.readRegister(REG_OP_STATUS)).toBe(OP_STANDBY);
  });

  it("AK-2.3: yeniden enerjide güç otomatik uygulanmaz", () => {
    const link = new StubLink();
    const pcs = makePcs(link);
    link.energized = false;
    pcs.tick(1);
    link.energized = true;
    pcs.tick(1);
    expect(pcs.readRegister(REG_GRID_V_AB)).toBe(4000);
    expect(pcs.readRegister(REG_GRID_ACTIVE_POWER)).toBe(0);
  });

  it("de-enerjiliyken setpoint yazımı çıkış üretmez", () => {
    const link = new StubLink();
    const pcs = makePcs(link);
    link.energized = false;
    pcs.writeSetting(SET_ACTIVE_POWER, (-200) & 0xffff);
    pcs.tick(1);
    expect(pcs.readRegister(REG_GRID_ACTIVE_POWER)).toBe(0);
  });
});
