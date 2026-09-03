import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TranslationProvider, TR_DICT, EN_DICT } from "@gd-monorepo/ui";
import { FIELD_TR_DICT } from "../../../i18n/tr";
import { PcsCard } from "./PcsCard";
import type { PcsSummary } from "./PcsCard";

/**
 * PcsCard sözleşmesi (2026-08-30 — RackCard formatı):
 * - Başlık pcsId + konteyner adını gösterir.
 * - Bağlantı rozeti: connected → "Çevrimiçi", değil → "Çevrimdışı".
 * - Durum rozeti: işaretli AC aktif güce göre şarj/deşarj/bekleme; kopuk
 *   bağlantı durum rozetini ezer.
 * - Ana metrik: AC aktif güç (işaretli, kW).
 * - Detay/Config butonları yalnızca callback verilirse render edilir ve
 *   tıklamada çağrılır.
 */

function pcs(overrides: Partial<PcsSummary> = {}): PcsSummary {
  return {
    pcsId: "PCS-1",
    containerId: "c-1",
    containerName: "c-1",
    connected: true,
    latestTelemetry: [
      {
        deviceId: "PCS-1",
        name: "AC Active Power",
        value: -42,
        description: "",
        unit: "kW",
        timestamp: "2026-08-30T12:00:00.000Z",
      },
    ],
    ...overrides,
  };
}

function renderCard(summary: PcsSummary, props: { onDetailClick?: () => void; onConfigClick?: () => void } = {}) {
  render(
    <TranslationProvider
      dictionaries={{ tr: { ...TR_DICT, ...FIELD_TR_DICT }, en: EN_DICT }}
      defaultLocale="tr"
    >
      <PcsCard pcs={summary} {...props} />
    </TranslationProvider>,
  );
}

describe("PcsCard", () => {
  it("pcsId ve konteyner adını gösterir", () => {
    renderCard(pcs());
    expect(screen.getByText("PCS-1")).toBeTruthy();
    expect(screen.getByText("c-1")).toBeTruthy();
  });

  it("bağlı PCS'te online rozeti görünür", () => {
    renderCard(pcs({ connected: true }));
    expect(screen.getByText("Çevrimiçi")).toBeTruthy();
  });

  it("kopuk PCS'te offline rozeti görünür", () => {
    renderCard(pcs({ connected: false }));
    expect(screen.getAllByText("Çevrimdışı").length).toBeGreaterThan(0);
  });

  it("negatif aktif güç → şarj rozeti", () => {
    renderCard(pcs());
    expect(screen.getByText("Şarj Oluyor")).toBeTruthy();
  });

  it("pozitif aktif güç → deşarj rozeti", () => {
    renderCard(
      pcs({
        latestTelemetry: [
          {
            deviceId: "PCS-1",
            name: "AC Active Power",
            value: 25,
            description: "",
            unit: "kW",
            timestamp: "2026-08-30T12:00:00.000Z",
          },
        ],
      }),
    );
    expect(screen.getByText("Deşarj Oluyor")).toBeTruthy();
  });

  it("sıfır aktif güç → bekleme rozeti", () => {
    renderCard(
      pcs({
        latestTelemetry: [
          {
            deviceId: "PCS-1",
            name: "AC Active Power",
            value: 0,
            description: "",
            unit: "kW",
            timestamp: "2026-08-30T12:00:00.000Z",
          },
        ],
      }),
    );
    expect(screen.getByText("Beklemede")).toBeTruthy();
  });

  it("ana metrik işaretli aktif gücü gösterir", () => {
    renderCard(pcs());
    expect(screen.getByText("−42.0 kW")).toBeTruthy();
  });

  it("Detay butonu onDetailClick'i çağırır", () => {
    const onDetailClick = vi.fn();
    renderCard(pcs(), { onDetailClick });
    fireEvent.click(screen.getByRole("button", { name: "Detay" }));
    expect(onDetailClick).toHaveBeenCalledTimes(1);
  });

  it("Config butonu onConfigClick'i çağırır", () => {
    const onConfigClick = vi.fn();
    renderCard(pcs(), { onConfigClick });
    fireEvent.click(screen.getByRole("button", { name: "Config" }));
    expect(onConfigClick).toHaveBeenCalledTimes(1);
  });

  it("callback verilmezse butonlar render edilmez", () => {
    renderCard(pcs());
    expect(screen.queryByRole("button", { name: "Detay" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Config" })).toBeNull();
  });
});

describe("PcsCard — genişletilmiş detaylar (2026-09-02)", () => {
  const telemetry = (name: string, value: number) => ({
    deviceId: "PCS-1",
    name,
    value,
    description: "",
    unit: "",
    timestamp: "2026-09-02T12:00:00.000Z",
  });

  it("AC/Kullanılabilir/Enerji bölümleri değerleri gösterir", () => {
    renderCard(
      pcs({
        latestTelemetry: [
          telemetry("AC Active Power", -42),
          telemetry("AC Voltage AB", 398),
          telemetry("AC Frequency", 50.1),
          telemetry("Power Factor", 0.99),
          telemetry("Phase Current A", 61.2),
          telemetry("Cabin Temperature", 33.4),
          telemetry("Available Charge Power", 480),
          telemetry("Available Discharge Power", 480),
          telemetry("Total Charge Energy", 1520),
          telemetry("Total Discharge Energy", 830),
        ],
      }),
    );

    expect(screen.getByText("398 V")).toBeTruthy();
    expect(screen.getByText("50.1 Hz")).toBeTruthy();
    expect(screen.getByText("0.99")).toBeTruthy();
    expect(screen.getByText("61.2 A")).toBeTruthy();
    expect(screen.getByText("33.4 °C")).toBeTruthy();
    expect(screen.getAllByText("480 kW").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("1520 kWh")).toBeTruthy();
    expect(screen.getByText("830 kWh")).toBeTruthy();
  });

  it("eksik genişletilmiş telemetri → 0.0/0 değerleri", () => {
    renderCard(pcs());
    expect(screen.getAllByText("0 V").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("0.0 Hz")).toBeTruthy();
    expect(screen.getAllByText("0.0 °C").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("0 kW").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("0 kWh").length).toBeGreaterThanOrEqual(2);
  });
});
