import { describe, it, expect } from "vitest";
import { listNovaUnits } from "@gd-monorepo/ui";
import { DEMO_TOPOLOGY, DEMO_UNIT_COUNT, cellCommandName } from "./demo-topology";

describe("demo-topology (UC-1/T-1, K1)", () => {
  it("9 ünite tanımlar (fider A 1-5, B 6-9)", () => {
    const units = listNovaUnits(DEMO_TOPOLOGY);
    expect(DEMO_UNIT_COUNT).toBe(9);
    expect(units.map((u) => u.n)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(units.filter((u) => u.feeder === "A")).toHaveLength(5);
    expect(units.filter((u) => u.feeder === "B")).toHaveLength(4);
  });

  it("fider yönü gdems ile aynı: A→H04, B→H05", () => {
    expect(DEMO_TOPOLOGY.feeders.A.cell).toBe("H04");
    expect(DEMO_TOPOLOGY.feeders.B.cell).toBe("H05");
    expect(DEMO_TOPOLOGY.feeders.A.units).toEqual([1, 2, 3, 4, 5]);
    expect(DEMO_TOPOLOGY.feeders.B.units).toEqual([6, 7, 8, 9]);
  });

  it("hücre motor/esMotor/auxTr bayraklarını taşır", () => {
    const byId = new Map(DEMO_TOPOLOGY.station.cells.map((c) => [c.id, c]));
    expect(byId.get("H04")?.motor).toBe(true);
    expect(byId.get("H04")?.es).toBe(true);
    expect(byId.get("H04")?.esMotor).toBe(false);
    expect(byId.get("H01")?.motor).toBe(true);
    expect(byId.get("H02")?.auxTr).toBe(true);
  });

  it("RMU toprak ayırıcısını (ES) ve motorlu H02'yi taşır", () => {
    const rmu = DEMO_TOPOLOGY.unit.rmu;
    const es = rmu.find((c) => c.id === "ES");
    expect(es?.kind).toBe("es");
    expect(rmu.find((c) => c.id === "H02")?.motor).toBe(true);
  });

  it("konteyner künyesini (bus/rack/sections/aux/fss) taşır", () => {
    const u = DEMO_TOPOLOGY.unit;
    expect(u.cellsSeries).toBe(408);
    expect(u.pcsMaxMW).toBe(1.725);
    expect(u.trVector).toBe("Dy11y11");
    expect(u.rackKWh).toBe(223);
    expect(u.bus).toEqual({ ratingA: 2000, rackFuseA: 220, dcCB: "SYW6GZ-4000", imd: "Bender isoPV1685RTU" });
    expect(u.rack?.packs).toBe(17);
    expect(u.rack?.bpu).toBe(true);
    expect(u.sections).toHaveLength(4);
    expect(u.auxLoads?.length).toBeGreaterThan(0);
    expect(u.fss?.panel).toContain("Sigma XT");
  });

  it("limitlerde tripC/zeroPowerMW taşır", () => {
    expect(DEMO_TOPOLOGY.limits.tripC).toBe(32);
    expect(DEMO_TOPOLOGY.limits.zeroPowerMW).toBe(0.2);
  });

  it("hücre aksiyonunu demo-MV komut adına eşler", () => {
    expect(cellCommandName("H05", "cb_open")).toBe("H05_open");
    expect(cellCommandName("H05", "es_close")).toBe("H05_earth_close");
    expect(cellCommandName("H01", "es_open")).toBe("H01_earth_open");
  });
});
