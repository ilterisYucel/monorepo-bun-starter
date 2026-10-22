import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DemoPlantOverview } from "./DemoPlantOverview";
import type { PlantStationConfig } from "./demo-plant";
import type { NovaMimicState, NovaTopology } from "./mimic-types";

/**
 * UC-11 plant overview kartı (collector + istasyon kartları) — SPEC AK-11.1..11.4/11.7.
 */
const topology = {
  id: "DEMO",
  name: "Demo",
  location: "Test",
  powerMW: 50,
  energyMWh: 32.112,
  station: { name: "MV", rating: "36 kV", busLabel: "34.5 kV", nominalKV: 34.5, poiLabel: "POI", poiCable: "c", cells: [] },
  feeders: { A: { cell: "H04", side: "L", units: [1, 2] }, B: { cell: "H05", side: "R", units: [3, 4] } },
  unit: { container: "LGES", containerMWh: 3.568, banks: ["A", "B"], racksPerBank: 8, cellsSeries: 408, dcRangeV: [1000, 1500], pcsAcV: 690, pcsKVA: 1725, pcsMaxMW: 1.725, trKVA: 3750, trRatio: "34.5/0.69 kV", trVector: "Dy11", lvLabel: "690 V", rmu: [] },
  aux: { trKVA: 400, trRatio: "34.5/0.4", trVector: "Dyn11", lvV: 400, station: "aux" },
  limits: { socMin: 3.5, socMax: 97, tempMin: 19, tempMax: 25, derateC: 28, derateReleaseC: 24, dTdtWarn: 2, dvWarn: 50, sohInfo: 95 },
} as unknown as NovaTopology;

const stations: PlantStationConfig[] = [
  { index: 0, key: "bess1", name: "BESS MV STATION #1", feeder: "A", units: [1, 2] },
  { index: 1, key: "bess2", name: "BESS MV STATION #2", feeder: "B", units: [3, 4] },
];

const bank = (soc: number) => ({ id: "A", soc, soh: 99, vdc: 1300, tmax: 24, dvmV: 10, racks: [24], dcb: "closed" as const });
const unit = (n: number, state: "dis" | "chg", pMW: number, soc: number) => ({
  n,
  rmu: { H01: "closed" as const, H02: "closed" as const, H03: "closed" as const, es: false },
  banks: [bank(soc), bank(soc)],
  pcs: [
    { id: "A", state, pMW, igbtC: 40, limited: false },
    { id: "B", state, pMW, igbtC: 40, limited: false },
  ],
  aux: { kW: 12, kvar: 1, v: 400, iA: 18, hz: 50, pf: 0.99 },
});

const state: NovaMimicState = {
  station: { H01: "closed", H02: "closed", H04: "closed", H05: "closed", kV: 34.5, hz: 50, es: {}, iA: {} },
  poiMW: 1.2,
  feederMW: { A: 0.6, B: 0.6 },
  units: [unit(1, "dis", 0.3, 55), unit(2, "dis", 0.3, 55), unit(3, "chg", 0.5, 45), unit(4, "chg", 0.5, 45)],
};

describe("DemoPlantOverview", () => {
  it("AK-11.1: collector tek hat Q01/Q02 ve istasyon kutuları", () => {
    const { container } = render(<DemoPlantOverview topology={topology} state={state} stations={stations} />);
    expect(screen.getByText("Plant overview")).toBeTruthy();
    expect(container.querySelector("svg.po")).not.toBeNull();
    expect(screen.getByText(/Q01 · incomer/)).toBeTruthy();
    expect(screen.getByText(/Q02 · metering/)).toBeTruthy();
    expect(container.querySelectorAll(".po-st")).toHaveLength(2);
  });

  it("AK-11.2: istasyon kartı isim + BESS aralığı + ünite kutucukları", () => {
    const { container } = render(<DemoPlantOverview topology={topology} state={state} stations={stations} />);
    expect(screen.getByText("BESS MV STATION #1")).toBeTruthy();
    expect(screen.getByText("BESS MV STATION #2")).toBeTruthy();
    expect(screen.getByText(/BESS#1–2 · 2 × 3.568 MWh/)).toBeTruthy();
    expect(container.querySelectorAll(".po-st")[0]?.querySelectorAll(".po-u")).toHaveLength(2);
    expect(container.querySelectorAll(".po-st")[1]?.querySelectorAll(".po-u")).toHaveLength(2);
  });

  it("AK-11.4: Manual aktif, Peak shaving disabled", () => {
    render(<DemoPlantOverview topology={topology} state={state} stations={stations} />);
    const manual = screen.getByText("Manual") as HTMLButtonElement;
    const peak = screen.getByText("Peak shaving") as HTMLButtonElement;
    expect(manual.getAttribute("aria-pressed")).toBe("true");
    expect(peak.disabled).toBe(true);
  });

  it("AK-11.5: istasyon kartı tıklaması onStationSelect(index) çağırır", () => {
    const onStationSelect = vi.fn();
    const { container } = render(
      <DemoPlantOverview topology={topology} state={state} stations={stations} onStationSelect={onStationSelect} />,
    );
    const second = container.querySelectorAll(".po-st")[1];
    fireEvent.click(second);
    expect(onStationSelect).toHaveBeenCalledWith(1);
  });

  it("AK-11.7: seri yokken günlük enerji '—'", () => {
    render(<DemoPlantOverview topology={topology} state={state} stations={stations} />);
    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(3);
  });

  it("AK-11.7: seri varsa günlük enerji hesaplanır", () => {
    const t0 = 1_000_000_000;
    const powerPoints = [
      { t: t0, value: 10 },
      { t: t0 + 3_600_000, value: 10 },
    ];
    render(<DemoPlantOverview topology={topology} state={state} stations={stations} powerPoints={powerPoints} />);
    expect(screen.getByText("10.0 MWh")).toBeTruthy();
  });

  it("AK-11.9: illüstratif PV kutuları + collector Metal Clad", () => {
    const sources = [
      { index: 0, key: "src1", name: "PV MV STATION #1", units: [0, 1, 2, 3, 4, 5, 6], unitMVA: 4.3, mw: 22.0 },
      { index: 1, key: "src2", name: "PV MV STATION #2", units: [7, 8, 9, 10, 11, 12, 13], unitMVA: 4.3, mw: 21.4 },
    ];
    const { container } = render(
      <DemoPlantOverview
        topology={topology}
        state={state}
        stations={stations}
        sources={sources}
        collector={{ name: "Metal Clad", installedMW: 74.45, limitMW: 50 }}
      />,
    );
    expect(container.querySelectorAll(".po-st")).toHaveLength(4);
    expect(screen.getByText("PV MV STATION #1")).toBeTruthy();
    expect(screen.getByText("PV MV STATION #2")).toBeTruthy();
    expect(screen.getByText(/installed 74.5 MW > 50 MW → Metal Clad/)).toBeTruthy();
    expect(screen.getByText("Solar output")).toBeTruthy();
  });

  it("AK-11.10: PV kutusu tıklaması onSourceSelect(key) çağırır", () => {
    const sources = [
      { index: 0, key: "src1", name: "PV MV STATION #1", units: [0, 1, 2, 3, 4, 5, 6], unitMVA: 4.3, mw: 22.0 },
      { index: 1, key: "src2", name: "PV MV STATION #2", units: [7, 8, 9, 10, 11, 12, 13], unitMVA: 4.3, mw: 21.4 },
    ];
    const onSourceSelect = vi.fn();
    const { container } = render(
      <DemoPlantOverview
        topology={topology}
        state={state}
        stations={stations}
        sources={sources}
        collector={{ name: "Metal Clad", installedMW: 74.45, limitMW: 50 }}
        onSourceSelect={onSourceSelect}
      />,
    );
    // kutular: [bess1, bess2, src1, src2]
    fireEvent.click(container.querySelectorAll(".po-st")[2]);
    expect(onSourceSelect).toHaveBeenCalledWith("src1");
  });

  it("AK-11.11: peak shaving grafiği + peakSum görünür", () => {
    const sources = [{ index: 0, key: "src1", name: "PV MV STATION #1", units: [0, 1, 2, 3, 4, 5, 6], unitMVA: 4.3, mw: 22.0 }];
    render(
      <DemoPlantOverview topology={topology} state={state} stations={stations} sources={sources} peakMW={20} />,
    );
    expect(screen.getByText("Solar production & peak shaving · today")).toBeTruthy();
    expect(screen.getByText(/shaved → stored/)).toBeTruthy();
    expect(screen.getByText(/plant in Manual/)).toBeTruthy();
  });
});
