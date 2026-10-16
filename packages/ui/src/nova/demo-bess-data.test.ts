import { describe, it, expect } from "vitest";
import { BUSBAR_POINTS, CELLS_PER_PACK, PACKS_PER_RACK, busbarZoneHistory, packData, packFill, packMarkers, rackPacks, rackRegisters, tcMap18 } from "./demo-bess-data";

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

  it("rack register tablosu referans listesi (30 satır) + adresler", () => {
    const rows = rackRegisters(input, 3, { soc: 60, soh: 98, vdc: 1300, chgLimitKw: 160, disLimitKw: 160 });
    expect(rows).toHaveLength(30);
    expect(rows.every((r) => r.value.length > 0)).toBe(true);
    expect(rows.some((r) => r.name === "Rack SOC")).toBe(true);
    // base = 30170 + 150·(3−1) = 30470; offset 50 → 30520
    expect(rows.find((r) => r.name === "Rack State")?.address).toBe("30520");
    expect(rows.find((r) => r.name === "Rack SOC")?.address).toBe("30528");
  });

  it("packFill bant altı mavi, üstü kırmızı, ortada kademeli", () => {
    expect(packFill(10, 19, 25)).toContain("--nm-cold-rgb");
    expect(packFill(40, 19, 25)).toContain("--nm-hot-rgb");
    const mid = packFill(22, 19, 25);
    expect(mid).toContain("--nm-hot-rgb");
    expect(mid).not.toEqual(packFill(24, 19, 25));
  });

  it("busbarZoneHistory deterministik 4h örnek + cooling/heating fazları", () => {
    const anchor = { cellMax: 24, cellMin: 21, air: 26, sup: 20, cooling: true, heating: false };
    const a = busbarZoneHistory(anchor, 11, 1_000_000);
    const b = busbarZoneHistory(anchor, 11, 1_000_000);
    expect(a.samples).toHaveLength(BUSBAR_POINTS);
    expect(a.samples).toEqual(b.samples);
    expect(a.samples[0].tmin).toBeLessThan(a.samples[0].tmax);
    expect(a.phases.length).toBeGreaterThan(0);
    expect(a.phases.every((p) => p.kind === "cool")).toBe(true);
    expect(busbarZoneHistory({ ...anchor, cooling: false }, 11, 1_000_000).phases).toHaveLength(0);
  });
});
