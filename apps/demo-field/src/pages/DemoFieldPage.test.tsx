import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { NovaMimicState } from "@gd-monorepo/ui";
import { DEMO_TOPOLOGY } from "../features/demo-data/demo-topology";

const useDemoProject = vi.fn();
vi.mock("../features/demo-data/useDemoProject", () => ({
  useDemoProject: () => useDemoProject(),
  useDemoProjectRefresh: () => () => {},
}));

import { DemoProjectLayout } from "../layouts/DemoProjectLayout";
import { DemoFieldPage } from "./DemoFieldPage";

const emptyState: NovaMimicState = {
  station: {
    H01: "closed",
    H02: "closed",
    H04: "closed",
    H05: "closed",
    kV: DEMO_TOPOLOGY.station.nominalKV,
    hz: 50,
    es: {},
    iA: {},
  },
  poiMW: 0,
  feederMW: { A: 0, B: 0 },
  units: [],
};

function project(error?: string) {
  return {
    state: emptyState,
    kpis: {
      mode: "stby" as const,
      modeLabel: "Standby",
      poiMW: 0,
      poiDir: "Boşta" as const,
      avgSoc: 0,
      avgSoh: 0,
      sohMin: 0,
      tmax: 0,
      tmin: 0,
      availUnits: 0,
      totalUnits: 0,
      runPcs: 0,
      totalPcs: 0,
      alarms: 0,
      warns: 0,
      colds: 0,
      maints: 0,
    },
    alerts: [],
    trendData: { soc: [], power: [], temp: [] },
    restPhases: [],
    rest: { requiredMinutes: 30, complete: false },
    readyUnits: [],
    runs: [],
    logs: [],
    alarms: [],
    loading: false,
    error,
  };
}

function renderPage(error?: string) {
  useDemoProject.mockReturnValue(project(error));
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <MemoryRouter initialEntries={["/field/f-1"]}>
      <QueryClientProvider client={client}>
        <Routes>
          <Route path="/field/:fieldId" element={<DemoProjectLayout />}>
            <Route index element={<DemoFieldPage />} />
          </Route>
        </Routes>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

describe("DemoFieldPage — site layout (UC-4)", () => {
  beforeEach(() => vi.stubEnv("VITE_FIELD_ID", "f-1"));
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetAllMocks();
  });

  it("ortak üst blok + site yerleşimini render eder", () => {
    renderPage();
    expect(screen.getByTestId("project-strip")).toBeTruthy();
    expect(screen.getByText("Site layout")).toBeTruthy();
    expect(screen.getByText("Trends")).toBeTruthy();
  });

  it("hata durumunda uyarı gösterir ama sayfa render olur", () => {
    renderPage("boom");
    expect(screen.getByText(/Project data error/)).toBeTruthy();
    expect(screen.getByText("Site layout")).toBeTruthy();
  });
});
