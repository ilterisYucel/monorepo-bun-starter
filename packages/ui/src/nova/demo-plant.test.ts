import { describe, it, expect } from "vitest";
import { buildPeakSeries, dailyEnergy, deriveCollectorOverview, deriveStationView, derivePlantOverview, deriveSourceStations, peakEnergySums } from "./demo-plant";
import type { NovaMimicState, NovaTopology } from "./mimic-types";

/**
 * UC-11 plant overview türevleri (SPEC AK-11.2/11.3/11.6). Saf; IO yok.
 */
const topology = {
  id: "DEMO",
  name: "Demo",
  location: "Test",
  powerMW: 30,
  energyMWh: 32.112,
  station: {
    name: "MV",
    rating: "36 kV",
    busLabel: "34.5 kV",
    nominalKV: 34.5,
    poiLabel: "POI",
    poiCable: "cable",
    cells: [],
  },
  feeders: {
    A: { cell: "H04", side: "L", units: [1, 2] },
    B: { cell: "H05", side: "R", units: [3, 4] },
  },
  unit: {
    container: "LGES",
    containerMWh: 3.568,
    banks: ["A", "B"],
    racksPerBank: 8,
    cellsSeries: 408,
    dcRangeV: [1000, 1500] as [number, number],
    pcsAcV: 690,
    pcsKVA: 1725,
    pcsMaxMW: 1.725,
    trKVA: 3750,
    trRatio: "34.5/0.69 kV",
    trVector: "Dy11y11",
    lvLabel: "690 V",
    rmu: [],
  },
  limits: { socMin: 3.5, socMax: 97, tempMin: 19, tempMax: 25, derateC: 28, derateReleaseC: 24, dTdtWarn: 2, dvWarn: 50, sohInfo: 95 },
} as unknown as NovaTopology;

const bank = (soc: number, tmax: number) => ({
  id: "A",
  soc,
  soh: 99,
  vdc: 1300,
  tmax,
  dvmV: 10,
  racks: [tmax],
  dcb: "closed" as const,
});

const unit = (n: number, state: "chg" | "dis" | "stby", pMW: number, soc: number, tmax: number) => ({
  n,
  rmu: { H01: "closed" as const, H02: "closed" as const, H03: "closed" as const, es: false },
  banks: [bank(soc, tmax), bank(soc, tmax)],
  pcs: [
    { id: "A", state, pMW, igbtC: 40, limited: false },
    { id: "B", state, pMW, igbtC: 41, limited: false },
  ],
  aux: { kW: 12, kvar: 1, v: 400, iA: 18, hz: 50, pf: 0.99 },
});

const state: NovaMimicState = {
  station: { H01: "closed", H02: "closed", H04: "closed", H05: "closed", kV: 34.5, hz: 50, es: {}, iA: {} },
  poiMW: 1.2,
  feederMW: { A: 0.6, B: 0.6 },
  units: [unit(1, "dis", 0.3, 55, 24), unit(2, "chg", 0.5, 45, 26), unit(3, "stby", 0, 60, 22), unit(4, "dis", 0.4, 50, 23)],
};

describe("derivePlantOverview", () => {
  it("AK-11.3: POI/kV/akım ve feeder değerlerini türetir", () => {
    const o = derivePlantOverview(state, topology);
    expect(o.poiMW).toBe(1.2);
    expect(o.poiKv).toBe(34.5);
    expect(o.poiAmp).toBeGreaterThan(0);
    expect(o.feeders.map((f) => f.id)).toEqual(["A", "B"]);
    expect(o.feeders[0].mw).toBe(0.6);
    expect(o.feeders[0].first).toBe(1);
    expect(o.auxKW).toBe(12);
  });

  it("AK-11.2: ünite MW işareti (şarj negatif), SOC ort, Tmax maks", () => {
    const o = derivePlantOverview(state, topology);
    expect(o.units).toHaveLength(4);
    expect(o.units[0].mw).toBeCloseTo(0.6); // 2 × +0.3
    expect(o.units[1].mw).toBeCloseTo(-1.0); // 2 × −0.5
    expect(o.units[2].mw).toBe(0);
    expect(o.units[1].soc).toBe(45);
    expect(o.units[1].tmax).toBe(26);
    expect(o.units[1].status.length).toBeGreaterThan(0);
  });
});

describe("dailyEnergy", () => {
  it("AK-11.6: 1 saat sabit 10 MW → 10 MWh exported", () => {
    const t0 = 1_000_000_000;
    const points = [
      { t: t0, value: 10 },
      { t: t0 + 1_800_000, value: 10 },
      { t: t0 + 3_600_000, value: 10 },
    ];
    const d = dailyEnergy(points, 9, 3.568);
    expect(d.hasData).toBe(true);
    expect(d.exportedMWh).toBeCloseTo(10, 1);
    expect(d.importedMWh).toBe(0);
    expect(d.cycles).toBeCloseTo(10 / (9 * 3.568), 3);
    expect(d.approximate).toBe(true);
  });

  it("negatif güç imported sayılır", () => {
    const t0 = 5_000;
    const d = dailyEnergy(
      [
        { t: t0, value: -4 },
        { t: t0 + 3_600_000, value: -4 },
      ],
      9,
      3.568,
    );
    expect(d.importedMWh).toBeCloseTo(4, 1);
    expect(d.exportedMWh).toBe(0);
  });

  it("boş/kısa seri → hasData false", () => {
    expect(dailyEnergy([], 9, 3.568).hasData).toBe(false);
    expect(dailyEnergy([{ t: 1, value: 2 }], 9, 3.568).hasData).toBe(false);
  });
});

describe("deriveStationView / deriveCollectorOverview", () => {
  const stations = [
    { index: 0, key: "bess1", name: "BESS MV STATION #1", feeder: "A" as const, units: [1, 2] },
    { index: 1, key: "bess2", name: "BESS MV STATION #2", feeder: "B" as const, units: [3, 4] },
  ];

  it("AK-11.6: istasyon MW/SOC/durum türevleri", () => {
    const a = deriveStationView(state, topology, stations[0]);
    // unit1 dis 0.3 + unit2 chg 0.5 → +0.6 −1.0 = −0.4 MW; unit2 tmax 26 > 25 → alarm → FAULT
    expect(a.mw).toBeCloseTo(-0.4);
    expect(a.status).toBe("FAULT");
    expect(a.sev).toBe("alarm");
    expect(a.soc).toBe(50); // (55 + 45) / 2
    expect(a.first).toBe(1);
    expect(a.last).toBe(2);
    expect(a.energyMWh).toBeCloseTo(2 * 3.568);
    expect(a.n).toBe(2);
    expect(a.available).toBe(1); // unit2 alarm

    const b = deriveStationView(state, topology, stations[1]);
    // unit3 stby 0 + unit4 dis 0.4 → +0.8; ikisi de bantta
    expect(b.mw).toBeCloseTo(0.8);
    expect(b.status).toBe("DISCHARGE");
    expect(b.sev).toBeNull();
    expect(b.energyMWh).toBeCloseTo(2 * 3.568);
  });

  it("AK-11.3: collector overview POI/kV ve 2 istasyon", () => {
    const ov = deriveCollectorOverview(state, topology, stations);
    expect(ov.poiMW).toBe(1.2);
    expect(ov.poiKv).toBe(34.5);
    expect(ov.stations).toHaveLength(2);
    expect(ov.stations.map((s) => s.name)).toEqual(["BESS MV STATION #1", "BESS MV STATION #2"]);
  });

  it("boş istasyon ünite listesi throw etmez", () => {
    const empty = deriveStationView({ ...state, units: [] }, topology, stations[0]);
    expect(empty.n).toBe(0);
    expect(empty.mw).toBe(0);
    expect(empty.soc).toBe(0);
  });
});

describe("deriveSourceStations", () => {
  it("illüstratif PV istasyonlarını per-unit eşit böler", () => {
    const views = deriveSourceStations([
      { index: 0, key: "src1", name: "PV MV STATION #1", units: [0, 1, 2], unitMVA: 4.3, mw: 9 },
    ]);
    expect(views).toHaveLength(1);
    expect(views[0].n).toBe(3);
    expect(views[0].mw).toBe(9);
    expect(views[0].unitMW).toEqual([3, 3, 3]);
  });
});

describe("buildPeakSeries / peakEnergySums (FR-11.11)", () => {
  const now = Date.UTC(2026, 9, 14, 12, 0, 0);

  it("gün serisi 97 örnek (15 dk) + gece 0 / gündüz üretim", () => {
    const s = buildPeakSeries(now, 30, 20, 43.4);
    expect(s.samples).toHaveLength(97);
    expect(s.samples[0].src).toBeCloseTo(0, 5); // gece yarısı
    const noon = s.samples[48];
    expect(noon.src).toBeGreaterThan(0);
    expect(noon.threshold).toBe(20);
    expect(noon.conn).toBe(30);
  });

  it("enerji toplamları: production > shaved > 0, released 0, curtailed > 0", () => {
    const s = buildPeakSeries(now, 30, 20, 43.4);
    const e = peakEnergySums(s.samples);
    expect(e.productionMWh).toBeGreaterThan(0);
    expect(e.shavedMWh).toBeGreaterThan(0);
    expect(e.shavedMWh).toBeLessThan(e.productionMWh);
    expect(e.releasedMWh).toBe(0);
    expect(e.curtailedMWh).toBeGreaterThan(0); // 43.4 > 30 conn
  });

  it("solar < threshold → shaved 0", () => {
    const e = peakEnergySums(buildPeakSeries(now, 50, 30, 25).samples);
    expect(e.shavedMWh).toBe(0);
    expect(e.curtailedMWh).toBe(0);
  });
});
