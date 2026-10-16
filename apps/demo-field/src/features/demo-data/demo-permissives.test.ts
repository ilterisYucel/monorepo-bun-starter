import { describe, it, expect } from "vitest";
import type { NovaMimicState, NovaTopology } from "@gd-monorepo/ui";
import { DEMO_TOPOLOGY } from "./demo-topology";
import { derivePermissives, deriveStartupChecks } from "./demo-permissives";

function state(over: Partial<NovaMimicState> = {}): NovaMimicState {
  return {
    station: {
      H01: "closed",
      H02: "closed",
      H04: "closed",
      H05: "closed",
      kV: 34.5,
      hz: 50,
      es: { H01: false, H04: false, H05: false },
      iA: {},
    },
    poiMW: 0,
    feederMW: { A: 0, B: 0 },
    units: [
      {
        n: 1,
        rmu: { H01: "closed", H02: "closed", H03: "closed", es: false },
        banks: [
          { id: "A", soc: 50, soh: 98, vdc: 1300, tmax: 23, tmin: 21, dvmV: 10, racks: [23], dcb: "closed" },
          { id: "B", soc: 50, soh: 98, vdc: 1290, tmax: 23, tmin: 21, dvmV: 10, racks: [23], dcb: "closed" },
        ],
        pcs: [
          { id: "A", state: "stby", pMW: 0, igbtC: 40, limited: false, chgLimitKw: 500, disLimitKw: 500 },
          { id: "B", state: "stby", pMW: 0, igbtC: 40, limited: false, chgLimitKw: 500, disLimitKw: 500 },
        ],
        aux: { kW: 20, kvar: 2, v: 400, iA: 30, hz: 50, pf: 1 },
      },
    ],
    ...over,
  } as NovaMimicState;
}

const topo = DEMO_TOPOLOGY as NovaTopology;

describe("derivePermissives (UC-5, referans sim.permissives)", () => {
  it("referans madde başlıklarını üretir (8 madde)", () => {
    const perms = derivePermissives(state(), topo, { dir: "chg", powerKw: 200, scope: [1] });
    expect(perms).toHaveLength(8);
    expect(perms[0].label).toBe("Site status Ready (FL-01)");
    expect(perms.find((p) => p.label.includes("Requested power at POI"))).toBeTruthy();
    expect(perms.some((p) => p.label.includes("Calibration not overdue"))).toBe(true);
  });

  it("sağlıklı durumda tüm kontroller ok", () => {
    const perms = derivePermissives(state(), topo, { dir: "chg", powerKw: 200, scope: [1] });
    expect(perms.every((p) => p.ok)).toBe(true);
  });

  it("toprak kapalı → hard fail (yalnız earthing hard)", () => {
    const s = state();
    s.station.es.H01 = true;
    const perms = derivePermissives(s, topo, { dir: "chg", powerKw: 200, scope: [1] });
    const es = perms.find((p) => p.label.includes("earthing switch closed"))!;
    expect(es.ok).toBe(false);
    expect(es.hard).toBe(true);
    // diğer maddeler hard değil
    expect(perms.filter((p) => p.hard).length).toBe(1);
  });

  it("PCS arızası → PCS ready + fault/maintenance fail (hard değil)", () => {
    const s = state();
    s.units[0].pcs[0] = { ...s.units[0].pcs[0], state: "fault" };
    s.units[0].pcs[1] = { ...s.units[0].pcs[1], state: "fault" };
    const perms = derivePermissives(s, topo, { dir: "dis", powerKw: 100, scope: [1] });
    const ready = perms.find((p) => p.label.includes("PCS ready"))!;
    expect(ready.ok).toBe(false);
    expect(ready.hard).toBe(false);
    expect(perms.find((p) => p.label.includes("fault or maintenance"))!.ok).toBe(false);
  });

  it("istem isteği available üstünde → madde 8 fail", () => {
    const perms = derivePermissives(state(), topo, { dir: "chg", powerKw: 5000, scope: [1] });
    const p = perms.find((x) => x.label.includes("Requested power at POI"))!;
    expect(p.ok).toBe(false);
    expect(p.detail).toContain("/");
  });
});

describe("deriveStartupChecks (FL-01)", () => {
  it("5 site availability satırı üretir", () => {
    const checks = deriveStartupChecks(state(), topo);
    expect(checks).toHaveLength(5);
    expect(checks.map((c) => c.label)).toEqual([
      "Site status",
      "All devices online (heartbeats)",
      "AUX transformer analyzer",
      "MV grid (H03 metering)",
      "Incomer H01 closed",
    ]);
    expect(checks.every((c) => c.ok)).toBe(true);
  });
});
