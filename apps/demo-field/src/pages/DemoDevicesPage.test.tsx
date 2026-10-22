import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { NovaMimicState, NovaUnitState } from "@gd-monorepo/ui";
import { DEMO_STATIONS, stationTopo, type DemoStation } from "../features/demo-data/demo-stations";
import type { DemoProjectContextValue } from "../layouts/DemoProjectLayout";
import { DemoDevicesPage } from "./DemoDevicesPage";

/**
 * Devices ağacı istasyon bazlıdır (gdems `activate`): istasyon 2 üniteleri
 * BESS#10–18'dir. Regresyon: ağaç şablon fiderlerini (1–9) kullandığında
 * istasyon 2'de battery group butonları hiç render edilmiyordu.
 */

let ctx: DemoProjectContextValue;

const unit = (n: number): NovaUnitState => ({
  n,
  rmu: { H01: "closed", H02: "closed", H03: "closed", es: false },
  banks: [
    { id: "A", soc: 50, soh: 99, vdc: 1300, tmax: 23, dvmV: 10, racks: [23], dcb: "closed" },
  ],
  pcs: [{ id: "A", state: "stby", pMW: 0, igbtC: 40, limited: false }],
});

function stationCtx(station: DemoStation): DemoProjectContextValue {
  const state = {
    station: { H01: "closed", H02: "closed", H04: "closed", H05: "closed", kV: 34.5, hz: 50, es: {}, iA: {} },
    poiMW: 0,
    feederMW: { A: 0, B: 0 },
    units: station.units.map(unit),
  } as NovaMimicState;
  return {
    fieldId: "",
    base: "",
    openDevices: () => undefined,
    activeStation: station.index,
    setActiveStation: () => undefined,
    stationState: state,
    stationTopology: stationTopo(station),
    stationAlerts: [],
    stationSystems: {},
  } as unknown as DemoProjectContextValue;
}

vi.mock("../layouts/DemoProjectLayout", () => ({
  useDemoProjectContext: () => ctx,
}));

function renderPage(): void {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <MemoryRouter initialEntries={["/field/f-1/devices"]}>
      <QueryClientProvider client={client}>
        <DemoDevicesPage />
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

describe("DemoDevicesPage — istasyon bazlı ağaç", () => {
  beforeEach(() => cleanup());

  it("istasyon 2: Battery groups BESS#10–18 listelenir", () => {
    ctx = stationCtx(DEMO_STATIONS[1]!);
    renderPage();
    expect(screen.getAllByText(/BESS#10/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/BESS#18/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/BESS#1\b/)).toBeNull();
  });

  it("istasyon 2: BESS#10 seçilince battery alt sekmeleri açılır", () => {
    ctx = stationCtx(DEMO_STATIONS[1]!);
    renderPage();
    fireEvent.click(screen.getAllByText(/BESS#10/)[0]!);
    expect(screen.getByTestId("devtab-battery")).toBeTruthy();
    expect(screen.getByTestId("devtab-pcs")).toBeTruthy();
  });

  it("istasyon 1: BESS#1–9 listelenir (regresyon)", () => {
    ctx = stationCtx(DEMO_STATIONS[0]!);
    renderPage();
    expect(screen.getAllByText(/BESS#1\b/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/BESS#9/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/BESS#10/)).toBeNull();
  });
});
