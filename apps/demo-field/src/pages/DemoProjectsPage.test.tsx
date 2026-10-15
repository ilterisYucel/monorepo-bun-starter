import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

vi.mock("../lib/site-field", () => ({
  siteFieldId: () => "FIELD-1",
}));
vi.mock("../lib/api-base", () => ({
  isTunnelMode: () => false,
}));
vi.mock("../features/demo-data/demoMarketApi", () => ({
  demoMarketApi: { external: async () => [] },
}));
vi.mock("../features/demo-data/useDemoFieldData", () => ({
  useDemoFieldData: () => ({ data: [], isLoading: false, error: null }),
}));
vi.mock("../features/demo-data/useDemoFieldTelemetry", () => ({
  useDemoFieldTelemetry: () => ({ data: [], isLoading: false, error: null }),
}));

import { DemoProjectsPage } from "./DemoProjectsPage";

const renderPage = (): ReturnType<typeof render> => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <DemoProjectsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

/**
 * UC-11 (FR-11.1/FR-11.2/FR-11.6) — Projeler sayfası kompozisyonu:
 * harita + iki proje kartı + PTF kartı + Asset management + Market paneli.
 */
describe("DemoProjectsPage (UC-11)", () => {
  it("AK-11.1/11.2: başlık, iki proje ve haritayı render eder", () => {
    renderPage();
    expect(screen.getByRole("heading", { name: "Projects" })).toBeTruthy();
    expect(screen.getByTestId("demo-portfolio-map")).toBeTruthy();
    expect(screen.getAllByText("GD-1").length).toBeGreaterThan(0);
    expect(screen.getAllByText("GD-2").length).toBeGreaterThan(0);
  });

  it("AK-11.6: PTF kartı, Asset management ve Market paneli görünür", () => {
    renderPage();
    expect(screen.getByTestId("demo-ptf-card")).toBeTruthy();
    expect(screen.getByTestId("demo-asset-table")).toBeTruthy();
    expect(screen.getByText(/Market · EPİAŞ/)).toBeTruthy();
  });

  it("harita lejantı ve New project yer tutucusu vardır", () => {
    renderPage();
    expect(screen.getByText(/discharging/)).toBeTruthy();
    expect(screen.getByText("New project")).toBeTruthy();
  });
});
