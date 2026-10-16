import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DemoProjectCard } from "./DemoProjectCard";
import { DemoPtfCard } from "./DemoPtfCard";
import type { MarketHour } from "./demo-market";

const kpis = [
  { label: "POI", value: "12.0 MW", sub: "discharging" },
  { label: "SOC · SOH", value: "63.5 %", sub: "SOH 97.9 %" },
  { label: "Capacity", value: "32.1 MWh", sub: "28.9 dischargeable" },
];

describe("DemoProjectCard (UC-11)", () => {
  it("AK-11.2: ad, alt başlık ve 3 KPI gösterir", () => {
    render(
      <DemoProjectCard
        name="GD-1"
        status="Online"
        subtitle="Polatlı, Ankara · 30 MWe"
        kpis={kpis}
        live
      />,
    );
    expect(screen.getByText("GD-1")).toBeTruthy();
    expect(screen.getByText(/Polatlı/)).toBeTruthy();
    expect(screen.getByText("12.0 MW")).toBeTruthy();
    expect(screen.getByText("Open project →")).toBeTruthy();
  });

  it("AK-11.5: canlı kart buton, tıklama onOpen çağırır", () => {
    const onOpen = vi.fn();
    render(
      <DemoProjectCard
        name="GD-1"
        status="Online"
        subtitle="s"
        kpis={kpis}
        live
        onOpen={onOpen}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /GD-1/ }));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it("AK-11.3: statik kart 'demo' işaretli ve buton değil", () => {
    render(
      <DemoProjectCard
        name="GD-2"
        status="Standby"
        subtitle="Antalya"
        kpis={kpis}
        live={false}
        onOpen={() => undefined}
      />,
    );
    expect(screen.queryByRole("button", { name: /GD-2/ })).toBeNull();
    expect(screen.getAllByText(/demo/i).length).toBeGreaterThan(0);
  });
});

const hours: MarketHour[] = Array.from({ length: 24 }, (_, h) => ({
  h,
  ptf: h === 9 ? 1620 : h === 19 ? 4500 : 3000,
  gip: 3100,
  smf: 0,
  dir: "DENGEDE",
}));

describe("DemoPtfCard (UC-11, FR-11.6)", () => {
  it("AK-11.6: saatlik PTF kartını ve özet değerleri gösterir", () => {
    render(<DemoPtfCard hours={hours} nowHour={9} />);
    expect(screen.getByTestId("demo-ptf-card")).toBeTruthy();
    expect(screen.getByText("1,620")).toBeTruthy();
    expect(screen.getByText(/Today avg/)).toBeTruthy();
  });

  it("seri boşsa 'No market data' gösterir (uydurma yok)", () => {
    render(
      <DemoPtfCard
        hours={Array.from({ length: 24 }, (_, h) => ({
          h,
          ptf: 0,
          gip: 0,
          smf: 0,
          dir: "DENGEDE",
        }))}
      />,
    );
    expect(screen.getByText(/No market data/)).toBeTruthy();
  });
});
