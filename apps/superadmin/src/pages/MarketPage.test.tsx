import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { TR_DICT, EN_DICT, TranslationProvider } from "@gd-monorepo/ui";
import { BOSS_TR_DICT } from "../i18n/tr";
import { BOSS_EN_DICT } from "../i18n/en";
import { MarketPage } from "./MarketPage";
import { useMarket } from "../features/market/hooks/useMarket";
import type { ChartDataPoint } from "@gd-monorepo/ui";

/**
 * MarketPage sözleşmesi (2026-09-14 — "invalid date" çökmesi kapatılır):
 * - ChartDataPoint.timestamp sözleşmesi `new Date()` ile parse edilebilir
 *   değer ister (MultiLineChartV2 sıralama/uPlot verisinde new Date çağırır).
 *   MarketPage timestamp'i GÖRÜNTÜLEME formatına ÇEVİRMEZ (toLocaleString) —
 *   backend ISO-8601 UTC döner, biçimlendirme chart'ın içindedir.
 * - Veri varken chart'a kaynak ISO timestamp'ler birebir gider.
 * - Boş veri → boş dizi; render tamamlanır (çökme yok).
 */

const capturedCharts: { title: string | undefined; data: ChartDataPoint[] }[] = [];

vi.mock("@gd-monorepo/ui", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@gd-monorepo/ui")>();
  return {
    ...actual,
    MultiLineChartV2: (props: {
      data: ChartDataPoint[];
      title?: string;
    }) => {
      capturedCharts.push({ title: props.title, data: props.data });
      return <div data-testid="chart" />;
    },
  };
});

vi.mock("../features/market/hooks/useMarket", () => ({
  useMarket: vi.fn(),
}));

const ISO_A = "2026-09-13T10:00:00.000Z";
const ISO_B = "2026-09-13T11:00:00.000Z";

function makeData() {
  return {
    ptf: {
      series: { source: "epias", series: "ptf" },
      points: [
        { timestamp: ISO_A, value: 2500, unit: "TRY/MWh" },
        { timestamp: ISO_B, value: 2600, unit: "TRY/MWh" },
      ],
      lastUpdatedAt: ISO_B,
    },
    gipWeightedAverage: {
      series: { source: "epias", series: "gip_wap" },
      points: [{ timestamp: ISO_A, value: 2400, unit: "TRY/MWh" }],
      lastUpdatedAt: ISO_A,
    },
    summary: {
      ptf: { timestamp: ISO_B, value: 2600, unit: "TRY/MWh" },
      gipWeightedAverage: null,
      ptfDayAverage: 2550,
      lastUpdatedAt: ISO_B,
    },
  };
}

function renderPage(data: ReturnType<typeof makeData> | null) {
  vi.mocked(useMarket).mockReturnValue({
    data,
    isLoading: false,
  });
  render(
    <TranslationProvider
      dictionaries={{ tr: TR_DICT, en: EN_DICT }}
      defaultLocale="tr"
      extraKeys={{ tr: BOSS_TR_DICT, en: BOSS_EN_DICT }}
    >
      <MarketPage />
    </TranslationProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  capturedCharts.length = 0;
});

describe("MarketPage", () => {
  it("veri varken chart timestamp'leri kaynak ISO ile birebir — parse edilebilir", () => {
    renderPage(makeData());

    const ptfChart = capturedCharts.find((c) => c.title === "PTF — Gün Öncesi");
    expect(ptfChart).toBeDefined();
    const timestamps = ptfChart!.data.map((d) => d.timestamp);
    expect(timestamps).toEqual([ISO_A, ISO_B]);
    for (const ts of timestamps) {
      expect(Number.isNaN(new Date(ts).getTime())).toBe(false);
    }
  });

  it("chart timestamp'lerinde görüntüleme formatı YOKTUR (dd.MM.yyyy HH:mm)", () => {
    renderPage(makeData());

    for (const chart of capturedCharts) {
      for (const d of chart.data) {
        // "14.09.2026 16:00" gibi biçimlendirilmiş string'ler new Date'de
        // Invalid Date üretir — sözleşme bunları yasaklar.
        expect(/\d{2}\.\d{2}\.\d{4}/.test(String(d.timestamp))).toBe(false);
      }
    }
  });

  it("boş veri → boş dizi, render tamamlanır (çökme yok)", () => {
    renderPage(null);

    expect(capturedCharts.length).toBeGreaterThanOrEqual(2);
    for (const chart of capturedCharts) {
      expect(chart.data).toEqual([]);
    }
    expect(screen.getAllByTestId("chart").length).toBeGreaterThanOrEqual(2);
  });

  it("lastUpdatedAt null → '—' (mevcut davranış korunur)", () => {
    const data = makeData();
    data.summary.lastUpdatedAt = null;
    renderPage(data);

    const seen = screen.getByText(/Son veri/);
    expect(seen.textContent).toContain("—");
  });
});
