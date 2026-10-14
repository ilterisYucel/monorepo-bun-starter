import { describe, it, expect } from "vitest";
import type { NovaMimicState } from "@gd-monorepo/ui";
import {
  DEMO_COLLECTOR,
  DEMO_SOURCE,
  DEMO_STATIONS,
  collectorType,
  demoPlantTotals,
  stateForStation,
  stationCoverage,
  stationForUnit,
  stationsForContainers,
  stationTopo,
  stationTopoByIndex,
} from "./demo-stations";
import { DEMO_TOPOLOGY } from "./demo-topology";

/**
 * UC-11 istasyon bölümü (SPEC AK-11.6/11.5). Saf config + topo/state süzme.
 */

const mkUnit = (n: number, state: "dis" | "chg", pMW: number) => ({
  n,
  rmu: { H01: "closed" as const, H02: "closed" as const, H03: "closed" as const, es: false },
  banks: [{ id: "A", soc: 50, soh: 99, vdc: 1300, tmax: 24, dvmV: 10, racks: [24], dcb: "closed" as const }],
  pcs: [
    { id: "A", state, pMW, igbtC: 40, limited: false },
    { id: "B", state, pMW, igbtC: 40, limited: false },
  ],
});

const state: NovaMimicState = {
  station: { H01: "closed", H02: "closed", H04: "closed", H05: "closed", kV: 34.5, hz: 50, es: {}, iA: {} },
  poiMW: 3,
  feederMW: { A: 1.5, B: 1.5 },
  units: [
    mkUnit(1, "dis", 0.3),
    mkUnit(2, "dis", 0.3),
    mkUnit(3, "dis", 0.3),
    mkUnit(4, "dis", 0.3),
    mkUnit(5, "dis", 0.3),
    mkUnit(6, "chg", 0.5),
    mkUnit(7, "chg", 0.5),
    mkUnit(8, "chg", 0.5),
    mkUnit(9, "chg", 0.5),
  ],
};

describe("demo-stations", () => {
  it("AK-11.6: 2 istasyon, 5+4 ünite, toplam 9", () => {
    expect(DEMO_STATIONS).toHaveLength(2);
    expect(DEMO_STATIONS[0].units).toEqual([1, 2, 3, 4, 5]);
    expect(DEMO_STATIONS[1].units).toEqual([6, 7, 8, 9]);
    expect(stationCoverage()).toEqual({ units: 9, expected: 9 });
  });

  it("AK-11.6: collector MV STATION ve hücre eşlemesi", () => {
    expect(DEMO_COLLECTOR.name).toBe("MV STATION");
    expect(DEMO_COLLECTOR.cellOf(0)).toBe("Q04");
    expect(DEMO_COLLECTOR.cellOf(1)).toBe("Q05");
  });

  it("stationForUnit doğru istasyonu döner", () => {
    expect(stationForUnit(1)?.index).toBe(0);
    expect(stationForUnit(5)?.index).toBe(0);
    expect(stationForUnit(6)?.index).toBe(1);
    expect(stationForUnit(9)?.index).toBe(1);
    expect(stationForUnit(10)).toBeUndefined();
  });

  it("AK-11.5: stationTopo yalnız o istasyonun fiderini taşır", () => {
    const t1 = stationTopoByIndex(0);
    expect(Object.keys(t1.feeders)).toEqual(["A"]);
    expect(t1.feeders.A?.units).toEqual([1, 2, 3, 4, 5]);
    expect(t1.station.name).toBe("BESS MV STATION #1");
    expect(t1.station.poiLabel).toBe("TO MV STATION Q04");
    const t2 = stationTopoByIndex(1);
    expect(Object.keys(t2.feeders)).toEqual(["B"]);
    expect(t2.feeders.B?.units).toEqual([6, 7, 8, 9]);
  });

  it("stateForStation üniteleri ve feeder/POI değerini süzer", () => {
    const s1 = stateForStation(state, DEMO_STATIONS[0]);
    expect(s1.units.map((u) => u.n)).toEqual([1, 2, 3, 4, 5]);
    // 5 × (+0.3 + 0.3) = 3.0 MW discharge
    expect(s1.poiMW).toBeCloseTo(3.0);
    expect(s1.feederMW.A).toBeCloseTo(3.0);
    const s2 = stateForStation(state, DEMO_STATIONS[1]);
    expect(s2.units.map((u) => u.n)).toEqual([6, 7, 8, 9]);
    // 4 × (−0.5 −0.5) = −4.0 MW charge
    expect(s2.poiMW).toBeCloseTo(-4.0);
    expect(s2.feederMW.B).toBeCloseTo(-4.0);
  });

  it("stationTopo orijinal DEMO_TOPOLOGY'yi bozmaz", () => {
    stationTopo(DEMO_STATIONS[0]);
    stationTopo(DEMO_STATIONS[1]);
    expect(Object.keys(DEMO_TOPOLOGY.feeders)).toEqual(["A", "B"]);
    expect(DEMO_TOPOLOGY.feeders.B.units).toEqual([6, 7, 8, 9]);
  });
});

describe("kollektör tipi + illüstratif PV (AK-11.9)", () => {
  it("collectorType kuralı: >50 MW → Metal Clad, aksi MV station", () => {
    expect(collectorType(31.05)).toBe("MV station");
    expect(collectorType(50)).toBe("MV station");
    expect(collectorType(50.1)).toBe("Metal Clad");
    expect(collectorType(81.45)).toBe("Metal Clad");
  });

  it("demoPlantTotals: BESS 31.05 + PV ≈ 43.4 → Metal Clad", () => {
    const t = demoPlantTotals();
    expect(t.bessMW).toBeCloseTo(31.05, 2);
    expect(t.sourceMW).toBeCloseTo(43.4, 1);
    expect(t.installedMW).toBeCloseTo(74.45, 1);
    expect(t.collector).toBe("Metal Clad");
  });

  it("DEMO_SOURCE: 2 PV istasyonu × 7 inverter", () => {
    expect(DEMO_SOURCE.stations).toHaveLength(2);
    expect(DEMO_SOURCE.stations[0].units).toHaveLength(7);
    expect(DEMO_SOURCE.stations[1].units).toHaveLength(7);
    expect(DEMO_SOURCE.stations[0].name).toBe("PV MV STATION #1");
  });
});

describe("stationsForContainers (UC-13)", () => {
  it("station etiketine göre konteynerleri istasyonlara atar", () => {
    const groups = stationsForContainers([
      { containerId: "container-1", station: "bess1" },
      { containerId: "container-2", station: "bess2" },
    ]);
    expect(groups).toHaveLength(2);
    expect(groups[0].containerIds).toEqual(["container-1"]);
    expect(groups[0].fallback).toBe(false);
    expect(groups[1].containerIds).toEqual(["container-2"]);
  });

  it("eksik etiketli istasyon ilk konteynere düşer (fallback)", () => {
    const groups = stationsForContainers([{ containerId: "container-1", station: "bess1" }]);
    expect(groups[0].containerIds).toEqual(["container-1"]);
    expect(groups[1].containerIds).toEqual(["container-1"]);
    expect(groups[1].fallback).toBe(true);
  });

  it("etiket yoksa tüm konteynerler her istasyona (legacy)", () => {
    const groups = stationsForContainers([{ containerId: "container-1" }]);
    expect(groups).toHaveLength(2);
    expect(groups[0].containerIds).toEqual(["container-1"]);
    expect(groups[0].fallback).toBe(true);
  });
});
