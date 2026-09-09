import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { FieldMap } from "./FieldMap";
import type { FieldMarker } from "./FieldMap.types";
import { TranslationProvider } from "../../core/TranslationProvider";
import { TR_DICT } from "../../i18n/tr";
import { EN_DICT } from "../../i18n/en";

/**
 * FieldMap sözleşmesi:
 * - Marker tıklaması navigasyon YAPMAZ — popup içeriği render edilir
 *   (saha adı, durum, konteyner n/m, güç, SoC, alarm).
 * - Popup "detay" butonu onOpenDetail(fieldId) çağırır; prop yoksa buton
 *   render edilmez.
 * - Field listesi boş değilse FitBounds map.fitBounds çağırır.
 */

const fitBounds = vi.fn();
const divIconCalls = vi.hoisted(() => ({ calls: [] as Array<Record<string, unknown>> }));

vi.mock("leaflet", () => ({
  default: {
    divIcon: (options: Record<string, unknown>) => {
      divIconCalls.calls.push(options);
      return {};
    },
    latLngBounds: vi.fn(() => ({ isValid: () => true })),
  },
}));

vi.mock("react-leaflet", () => ({
  MapContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="map-container">{children}</div>
  ),
  TileLayer: () => null,
  useMap: () => ({ fitBounds }),
  Marker: ({
    children,
    position,
  }: {
    children: React.ReactNode;
    position: [number, number];
  }) => (
    <div data-testid={`marker-${position[0]}-${position[1]}`}>{children}</div>
  ),
  Popup: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="popup">{children}</div>
  ),
}));

const fields: FieldMarker[] = [
  {
    id: "f-1",
    name: "Saha 1",
    lat: 38.4,
    lng: 27.1,
    status: "online",
    type: "wind",
    containerCount: 4,
    onlineContainerCount: 4,
    totalPowerMw: 12.4,
    avgSoc: 82,
    activeAlarms: 0,
  },
  {
    id: "f-2",
    name: "Saha 2",
    lat: 41.0,
    lng: 28.9,
    status: "offline",
    type: "hydro",
    containerCount: 2,
    onlineContainerCount: 0,
    activeAlarms: 3,
  },
];

const renderMap = (props: Partial<Parameters<typeof FieldMap>[0]> = {}) =>
  render(
    <TranslationProvider
      dictionaries={{ tr: TR_DICT, en: EN_DICT }}
      defaultLocale="tr"
    >
      <FieldMap fields={fields} {...props} />
    </TranslationProvider>,
  );

describe("FieldMap @ui", () => {
  it("her saha için marker render eder", () => {
    const { getByTestId } = renderMap();
    expect(getByTestId("marker-38.4-27.1")).toBeTruthy();
    expect(getByTestId("marker-41-28.9")).toBeTruthy();
  });

  it("popup saha kartını gösterir (FieldCard deseni — ad/durum/değerler)", () => {
    const { getAllByTestId } = renderMap();
    const [first, second] = getAllByTestId("popup");
    if (!first || !second) throw new Error("popup eksik");
    expect(first.textContent).toContain("Saha 1");
    expect(first.textContent).toContain("Çevrimiçi");
    expect(first.textContent).toContain("4/4");
    expect(first.textContent).toContain("12.4 MW");
    expect(first.textContent).toContain("%82");
    expect(second.textContent).toContain("Çevrimdışı");
    expect(second.textContent).toContain("Alarm");
    expect(second.textContent).toContain("3");
  });

  it("detay butonu onOpenDetail(fieldId) çağırır", () => {
    const onOpenDetail = vi.fn();
    const { getAllByRole } = renderMap({ onOpenDetail, detailLabel: "Sahaya Git" });
    const detailButton = getAllByRole("button", { name: "Sahaya Git" })[0];
    if (!detailButton) throw new Error("detay butonu eksik");
    fireEvent.click(detailButton);
    expect(onOpenDetail).toHaveBeenCalledWith("f-1");
  });

  it("onOpenDetail verilmezse detay butonu render edilmez (yalnız kart kalır)", () => {
    const { getAllByTestId, queryAllByRole } = renderMap();
    // Popup başına yalnızca FieldCard butonu kalır — detay butonu yok.
    expect(getAllByTestId("popup")).toHaveLength(2);
    expect(queryAllByRole("button", { name: "Sahaya Git" })).toHaveLength(0);
  });

  it("boş olmayan saha listesinde fitBounds çağrılır", () => {
    renderMap();
    expect(fitBounds).toHaveBeenCalled();
  });

  it("tip glifi status renkli daire üstüne işlenir (wind/hydro + renkler)", () => {
    divIconCalls.calls = [];
    renderMap();
    const htmls = divIconCalls.calls.map((c) => String(c.html ?? ""));
    const wind = htmls.find((html) => html.includes('data-field-type="wind"'));
    const hydro = htmls.find((html) => html.includes('data-field-type="hydro"'));
    expect(wind).toBeDefined();
    expect(wind).toContain("#10b981"); // online yeşili
    expect(hydro).toBeDefined();
    expect(hydro).toContain("#ef4444"); // offline kırmızısı
  });

  it("tip verilmezse general glifi kullanılır", () => {
    divIconCalls.calls = [];
    const { getByTestId } = renderMap({ fields: [{ ...fields[0]!, type: undefined }] });
    expect(getByTestId("map-container")).toBeTruthy();
    const htmls = divIconCalls.calls.map((c) => String(c.html ?? ""));
    expect(htmls[0]).toContain('data-field-type="general"');
  });
});
