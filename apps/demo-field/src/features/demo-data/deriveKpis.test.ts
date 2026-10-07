import { describe, it, expect } from "vitest";
import type { NovaMimicState, NovaTopology, NovaUnitState } from "@gd-monorepo/ui";
import { DEMO_TOPOLOGY } from "./demo-topology";
import { deriveAlerts, SEV_RANK } from "./deriveAlerts";
import { deriveKpis } from "./deriveKpis";

const topo: NovaTopology = DEMO_TOPOLOGY;

function unit(n: number): NovaUnitState {
  return {
    n,
    rmu: { H01: "closed", H02: "closed", H03: "closed", es: false },
    banks: [
      { id: "A", soc: 60, soh: 98, vdc: 1300, tmax: 24, tmin: 22, dvmV: 10, racks: [24], dcb: "closed" },
      { id: "B", soc: 55, soh: 97, vdc: 1290, tmax: 23, tmin: 21, dvmV: 12, racks: [23], dcb: "closed" },
    ],
    pcs: [
      { id: "A", state: "dis", pMW: 0.2, igbtC: 45, limited: false },
      { id: "B", state: "stby", pMW: 0, igbtC: 40, limited: false },
    ],
  };
}

function baseState(units: NovaUnitState[]): NovaMimicState {
  return {
    station: {
      H01: "closed",
      H02: "closed",
      H04: "closed",
      H05: "closed",
      kV: 34.5,
      hz: 50,
      es: { H01: false, H04: false, H05: false },
      iA: { H01: 10, H03: 10, H04: 5, H05: 5 },
    },
    poiMW: 0.4,
    feederMW: { A: 0.2, B: 0.2 },
    units,
  };
}

describe("deriveKpis (FR-4.1 / AK-4.1)", () => {
  it("ortalama SOC/SOH ve mod türetir", () => {
    const k = deriveKpis(baseState([unit(1), unit(2)]), topo);
    expect(k.totalUnits).toBe(2);
    expect(k.avgSoc).toBeCloseTo(57.5, 4);
    expect(k.mode).toBe("dis");
    expect(k.poiDir).toBe("Deşarj");
  });
});

describe("deriveAlerts (FR-4.2 / AK-4.2)", () => {
  it("severite sırasına göre sıralar ve alarmı öne alır", () => {
    const units = [unit(1), unit(2)];
    units[0].banks[0] = { ...units[0].banks[0], tmax: 30 }; // alarm (sıcak)
    units[1].banks[0] = { ...units[1].banks[0], tmin: 10 }; // cold
    const alerts = deriveAlerts(baseState(units), topo);
    expect(alerts.length).toBeGreaterThanOrEqual(2);
    expect(alerts[0].sev).toBe("alarm");
    // sıralama monoton
    for (let i = 1; i < alerts.length; i++) {
      expect(SEV_RANK[alerts[i].sev]).toBeGreaterThanOrEqual(SEV_RANK[alerts[i - 1].sev]);
    }
  });

  it("uyarı yoksa boş döner", () => {
    expect(deriveAlerts(baseState([unit(1)]), topo)).toEqual([]);
  });
});
