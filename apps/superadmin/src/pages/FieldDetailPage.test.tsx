import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { TR_DICT, EN_DICT, TranslationProvider } from "@gd-monorepo/ui";
import { BOSS_TR_DICT } from "../i18n/tr";
import { BOSS_EN_DICT } from "../i18n/en";
import { FieldDetailPage } from "./FieldDetailPage";

/**
 * FieldDetailPage render smoke — undefined icon (SCADA_ICONS.expand)
 * "Element type is invalid" hatasını yakalar (2026-09-09 düzeltmesi).
 */

const mockField = {
  id: "f-1",
  name: "Saha 1",
  location: { lat: 38.4, lng: 27.1 },
  api_url: "http://saha",
  status: "online",
  container_count: 4,
  online_containers: 4,
  total_power_mw: 12.4,
  avg_soc: 82,
  active_alarms: 0,
  last_seen_at: "2026-09-09T08:05:00.000Z",
  metadata: {},
  field_type: null,
  created_at: "",
  updated_at: "",
};

vi.mock("../features/fields/hooks/useAdminFields", () => ({
  useFieldList: () => ({ data: [] }),
  useField: () => ({ data: mockField }),
  useCreateField: () => ({ mutateAsync: vi.fn() }),
  useUpdateField: () => ({ mutateAsync: vi.fn() }),
  useDeleteField: () => ({ mutateAsync: vi.fn() }),
}));

const renderPage = () =>
  render(
    <TranslationProvider
      dictionaries={{ tr: TR_DICT, en: EN_DICT }}
      defaultLocale="tr"
      extraKeys={{ tr: BOSS_TR_DICT, en: BOSS_EN_DICT }}
    >
      <MemoryRouter initialEntries={["/fields/f-1"]}>
        <Routes>
          <Route path="/fields/:id" element={<FieldDetailPage />} />
        </Routes>
      </MemoryRouter>
    </TranslationProvider>,
  );

describe("FieldDetailPage", () => {
  it("render hatası olmadan saha özetini gösterir", async () => {
    renderPage();
    expect(await screen.findByText("Saha 1")).toBeDefined();
    expect(screen.getByText("Toplam Güç")).toBeDefined();
    expect(screen.getByText("Ort. SoC")).toBeDefined();
    expect(screen.getByRole("button", { name: "Field Uygulamasını Aç" })).toBeDefined();
  });

  it("bağlantı chip'i + son veri chip'i + aç butonu summary kartların ÜZERİNDE (header)", () => {
    renderPage();
    const openButton = screen.getByRole("button", { name: "Field Uygulamasını Aç" });
    const summary = screen.getByText("Toplam Güç");
    // Buton DOM'da summary kartından ÖNCE gelir (header satırı — field app paritesi).
    const before = openButton.compareDocumentPosition(summary);
    expect(before & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByText(/Son veri:/)).toBeDefined();
    expect(screen.getByText("Çevrimiçi")).toBeDefined();
  });
});
