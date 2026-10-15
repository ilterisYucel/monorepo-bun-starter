import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DemoAssetTable, type DemoAssetRow } from "./DemoAssetTable";

const rows: DemoAssetRow[] = [
  {
    key: "GDE-202030",
    name: "GD-1",
    location: "Polatlı, Ankara",
    source: "Standalone",
    connMW: 30,
    energyMWh: 32.112,
    mode: "Discharging",
    poiMW: 12.4,
    sourceMWh: null,
    exportedMWh: 84.2,
    importedMWh: 21.6,
    revenueTL: 412500,
    arbitrageTL: 98000,
    availableGroups: 8,
    totalGroups: 9,
    live: true,
  },
  {
    key: "GDE-202050",
    name: "GD-2",
    location: "Antalya",
    source: "Solar",
    connMW: 50,
    energyMWh: 64.224,
    mode: "Demo snapshot",
    poiMW: 41.2,
    sourceMWh: 180.4,
    exportedMWh: 240.1,
    importedMWh: 60.3,
    revenueTL: 1180000,
    arbitrageTL: 210000,
    availableGroups: 18,
    totalGroups: 18,
    live: false,
  },
];

/**
 * UC-11 (FR-11.6) — Asset management portföy tablosu: proje satırları,
 * POI işareti ve toplam satırı.
 */
describe("DemoAssetTable (UC-11)", () => {
  it("AK-11.6: proje satırlarını ve Portfolio toplamını gösterir", () => {
    render(<DemoAssetTable rows={rows} />);
    expect(screen.getByText("GD-1")).toBeTruthy();
    expect(screen.getByText("GD-2")).toBeTruthy();
    expect(screen.getByText(/Portfolio/)).toBeTruthy();
    expect(screen.getByTestId("demo-asset-table")).toBeTruthy();
  });

  it("pozitif POI dışa aktarım (c-dis) sınıfı alır", () => {
    const { container } = render(<DemoAssetTable rows={rows} />);
    const cells = container.querySelectorAll("td.c-dis");
    expect(cells.length).toBeGreaterThan(0);
    expect(cells[0]?.textContent).toContain("12.4");
  });

  it("toplam satırı bağlantı gücünü toplar", () => {
    render(<DemoAssetTable rows={rows} />);
    expect(screen.getByText(/80 MWe/)).toBeTruthy();
  });
});
