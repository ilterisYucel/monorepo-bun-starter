import { describe, it, expect } from "vitest";
import { CELLS_PER_PACK, PACKS_PER_RACK, packData, packMarkers, rackPacks, rackRegisters, tcMap18 } from "./demo-bess-data";

const input = { no: 3, soc: 60, soh: 98, v: 1300, temp: 24, cellsSeries: 408 };

describe("demo-bess-data (UC-4, D-1 türetim)", () => {
  it("pack hücreleri 24 adet ve deterministik", () => {
    const a = packData(input, 0);
    const b = packData(input, 0);
    expect(a.cells).toHaveLength(CELLS_PER_PACK);
    expect(a.cells).toEqual(b.cells);
    expect(a.cmaxId).toBeGreaterThanOrEqual(1);
    expect(a.cmaxId).toBeLessThanOrEqual(24);
    expect(a.cmax).toBeGreaterThanOrEqual(a.cmin);
  });

  it("4 sıcaklık sensörü ve PCB türetir", () => {
    const p = packData(input, 4);
    expect(p.ts).toHaveLength(4);
    expect(p.tmax).toBeGreaterThanOrEqual(p.tmin);
    expect(p.pcb).toHaveLength(2);
  });

  it("rackPacks 17 pack döner ve numaralar 1..17", () => {
    const packs = rackPacks(input);
    expect(packs).toHaveLength(PACKS_PER_RACK);
    expect(packs[0].no).toBe(1);
    expect(packs[16].no).toBe(17);
  });

  it("TC haritası 18 sensör + pack işaretleri", () => {
    const tc = tcMap18(input);
    expect(tc).toHaveLength(18);
    const m = packMarkers(input);
    expect(m.tMaxPack).toBeGreaterThanOrEqual(1);
    expect(m.tMaxPack).toBeLessThanOrEqual(17);
  });

  it("rack register tablosu ~30 satır ve değerler dolu", () => {
    const rows = rackRegisters(input, 3, { soc: 60, soh: 98, vdc: 1300, chgLimitKw: 160, disLimitKw: 160 });
    expect(rows.length).toBeGreaterThanOrEqual(20);
    expect(rows.every((r) => r.value.length > 0)).toBe(true);
    expect(rows.some((r) => r.name === "SOC")).toBe(true);
  });
});
