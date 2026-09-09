import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { TR_DICT, EN_DICT, TranslationProvider } from "@gd-monorepo/ui";
import { BOSS_TR_DICT } from "../i18n/tr";
import { BOSS_EN_DICT } from "../i18n/en";
import { FieldsPage } from "./FieldsPage";

/**
 * FieldsPage sözleşmesi (bütünleşik Sahalar sayfası — konsol paneli):
 * - Harita çerçevesiz, panel gradient + durum filtre çipleri + kart grid'i.
 * - "Saha Ekle" grid karosu (dashed) form modalını açar.
 * - Çipler grid'i filtreler; kart tıklaması detaya gider.
 * - Kart üzerinde sil butonu YOKTUR; boş listede add-tile kalır.
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
  last_seen_at: null,
  metadata: {},
  field_type: null,
  created_at: "",
  updated_at: "",
};

const listState: {
  data: typeof mockField[];
  isLoading: boolean;
  isError: boolean;
} = { data: [mockField], isLoading: false, isError: false };

const refetch = vi.fn();

vi.mock("../features/fields/hooks/useAdminFields", () => ({
  useFieldList: () => ({ ...listState, refetch }),
  useField: () => ({ data: undefined }),
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
      <MemoryRouter initialEntries={["/fields"]}>
        <Routes>
          <Route path="/fields" element={<FieldsPage />} />
          <Route path="/fields/:id" element={<div>saha-detay:test</div>} />
        </Routes>
      </MemoryRouter>
    </TranslationProvider>,
  );

describe("FieldsPage", () => {
  it("harita ve Saha Ekle karosu render edilir", () => {
    renderPage();
    expect(screen.getByTestId("map-container")).toBeDefined();
    expect(screen.getByRole("button", { name: "Saha Ekle" })).toBeDefined();
  });

  it("Saha Ekle karosu form modalını açar", () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Saha Ekle" }));
    expect(screen.getByLabelText("field-form")).toBeDefined();
    expect(screen.getByLabelText("Saha Adı")).toBeDefined();
  });

  it("saha kartı render edilir ve tıklamada detaya gider", async () => {
    renderPage();
    const panel = await screen.findByTestId("fields-panel");
    const card = within(panel).getByRole("button", { name: /Saha 1/ });
    fireEvent.click(card);
    expect(await screen.findByText("saha-detay:test")).toBeDefined();
  });

  it("kart üzerinde sil butonu YOKTUR (silme saha detayındadır)", () => {
    renderPage();
    expect(screen.queryByRole("button", { name: "Sil" })).toBeNull();
  });

  it("durum çipleri sayaçlıdır ve grid'i filtreler", () => {
    renderPage();
    const panel = screen.getByTestId("fields-panel");
    expect(within(panel).getByRole("button", { name: /Tümü \(1\)/ })).toBeDefined();
    expect(within(panel).getByRole("button", { name: /Çevrimiçi \(1\)/ })).toBeDefined();
    fireEvent.click(within(panel).getByRole("button", { name: /Çevrimdışı \(0\)/ }));
    expect(within(panel).queryByRole("button", { name: /Saha 1/ })).toBeNull();
    fireEvent.click(within(panel).getByRole("button", { name: /Çevrimiçi \(1\)/ }));
    expect(within(panel).getByRole("button", { name: /Saha 1/ })).toBeDefined();
  });

  it("yüklenirken kart ve 'kayıt yok' metni gösterilmez", () => {
    listState.data = [];
    listState.isLoading = true;
    listState.isError = false;
    renderPage();
    const panel = screen.getByTestId("fields-panel");
    expect(within(panel).queryByText(/Henüz saha kaydı yok/)).toBeNull();
    expect(within(panel).queryByRole("button", { name: /Saha 1/ })).toBeNull();
    listState.isLoading = false;
  });

  it("hata durumunda Tekrar Dene refetch çağırır", () => {
    listState.data = [];
    listState.isLoading = false;
    listState.isError = true;
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Tekrar Dene" }));
    expect(refetch).toHaveBeenCalled();
    listState.isError = false;
  });

  it("boş listede yalnızca Saha Ekle karosu kalır", () => {
    listState.data = [];
    listState.isLoading = false;
    listState.isError = false;
    renderPage();
    expect(screen.getByRole("button", { name: "Saha Ekle" })).toBeDefined();
    expect(screen.queryByText(/Henüz saha kaydı yok/)).toBeNull();
    listState.data = [mockField];
  });
});
