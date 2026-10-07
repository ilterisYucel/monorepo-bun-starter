import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  FREQ_RANGES,
  freqRangeOf,
  pfEnergyCheck,
  pfResponseMW,
  pfSlopeMWperHz,
  pqWithinCapability,
} from "./demo-market";
import { DemoMarketView } from "./DemoMarketView";
import { DemoTrendChart } from "./DemoTrendChart";
import { COLORS_LIGHT } from "../colors/tokensLight";

describe("demo-market (UC-9, FR-9.4 — TEİAŞ)", () => {
  it("PFK P–f: ölü bantta 0, ±200 mHz'de tam rezerv", () => {
    expect(pfResponseMW(50.005, 10)).toBe(0);
    expect(pfResponseMW(49.8, 10)).toBe(10);
    expect(pfResponseMW(50.2, 10)).toBe(-10);
    expect(pfResponseMW(49.95, 10)).toBeCloseTo(2.5, 6);
  });

  it("AK-9.4: R=10 MW → Δf/ΔP eğimi 50 MW/Hz + 1,25 h enerji kontrolü", () => {
    expect(pfSlopeMWperHz(10)).toBeCloseTo(50, 6);
    expect(pfEnergyCheck(12.5, 10).ok).toBe(true);
    expect(pfEnergyCheck(12, 10).ok).toBe(false);
    expect(pfEnergyCheck(12.5, 10).maxReserveMW).toBeCloseTo(10, 6);
  });

  it("P–Q kabiliyeti eşiği (0,4 / 1,0 pu)", () => {
    expect(pqWithinCapability(0.5, 0.4)).toBe(true);
    expect(pqWithinCapability(0.5, 0.5)).toBe(false);
    expect(pqWithinCapability(0.05, 0.9)).toBe(true);
    expect(pqWithinCapability(0.05, 1.1)).toBe(false);
  });

  it("frekans aralığı tablosu", () => {
    expect(FREQ_RANGES.length).toBe(4);
    expect(freqRangeOf(50)?.duration).toBe("Sürekli");
    expect(freqRangeOf(48.7)?.duration).toBe("1 sa");
    expect(freqRangeOf(46)).toBeUndefined();
  });
});

describe("DemoMarketView (UC-9, FR-9.3)", () => {
  it("seri boşsa 'veri yok' gösterir (uydurma yok)", () => {
    render(<DemoMarketView series={[]} />);
    expect(screen.getByText(/veri yok/)).toBeTruthy();
  });

  it("3 seri → 3 grafik + TEİAŞ kartlarını gösterir", () => {
    render(
      <DemoMarketView
        series={[
          {
            label: "PTF · GÖP (gün öncesi)",
            points: [
              { timestamp: "2026-10-07T00:00:00.000Z", value: 3450, unit: "TRY/MWh" },
              { timestamp: "2026-10-07T01:00:00.000Z", value: 3200, unit: "TRY/MWh" },
            ],
          },
          { label: "GİP AOF (gün içi)", points: [] },
          { label: "SMF · DGP (dengeleme)", points: [] },
        ]}
        reserveMW={10}
        availableMWh={13}
        frequencyHz={49.8}
      />,
    );
    expect(screen.getByTestId("demo-market")).toBeTruthy();
    expect(screen.getAllByText("PTF · GÖP (gün öncesi)").length).toBeGreaterThan(0);
    expect(screen.getAllByText("GİP AOF (gün içi)").length).toBeGreaterThan(0);
    expect(screen.getAllByText("SMF · DGP (dengeleme)").length).toBeGreaterThan(0);
    expect(screen.getByText("10,00 MW")).toBeTruthy();
    expect(screen.getByText("OK")).toBeTruthy();
  });
});

describe("DemoTrendChart padLeft (UC-9 düzeltme)", () => {
  const series = [
    {
      label: "s",
      points: [
        { t: 1, value: 1 },
        { t: 2, value: 2 },
      ],
      color: COLORS_LIGHT.cPow,
    },
  ];
  const labelX = (container: HTMLElement) =>
    container.querySelector("svg text")?.getAttribute("x");

  it("varsayılan sol pay DEĞİŞMEZ (diğer grafikler birebir)", () => {
    const { container } = render(
      <DemoTrendChart title="t" unit="u" series={series} />,
    );
    expect(labelX(container)).toBe("30"); // PAD.l 34 − 4
  });

  it("padLeft y-ekseni etiket konumunu kaydırır", () => {
    const { container } = render(
      <DemoTrendChart title="t" unit="u" series={series} padLeft={46} />,
    );
    expect(labelX(container)).toBe("42");
  });

  it("maxWidth azami genişliği uygular; varsayılan uygulamaz", () => {
    const { container: def } = render(
      <DemoTrendChart title="t" unit="u" series={series} />,
    );
    expect((def.firstChild as HTMLElement).style.maxWidth).toBe("");
    const { container: capped } = render(
      <DemoTrendChart title="t" unit="u" series={series} maxWidth={760} />,
    );
    expect((capped.firstChild as HTMLElement).style.maxWidth).toBe("760px");
  });
});
