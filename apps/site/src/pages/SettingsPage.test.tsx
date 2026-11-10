import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TranslationProvider, TR_DICT, EN_DICT } from "@gd-monorepo/ui";
import { FIELD_TR_DICT } from "../i18n/tr";
import { FIELD_EN_DICT } from "../i18n/en";
import { SettingsPage } from "./SettingsPage";
import { useSettingsStore } from "../features/settings/stores/settingsStore";

/**
 * SettingsPage sözleşmesi (2026-08-30):
 * - Görünüm bölümü: dark/light toggle + "yakında" notu (tema no-op).
 * - Dil bölümü: TR/EN butonları; EN tıklanınca settingsStore.locale "en"
 *   olur ve TranslationProvider EN sözlüğüne geçer (t() davranışı).
 */

function renderPage() {
  render(
    <TranslationProvider
      dictionaries={{ tr: { ...TR_DICT, ...FIELD_TR_DICT }, en: { ...TR_DICT, ...FIELD_EN_DICT } }}
      defaultLocale="tr"
    >
      <SettingsPage />
    </TranslationProvider>,
  );
}

beforeEach(() => {
  localStorage.clear();
  useSettingsStore.setState({ locale: "tr", theme: "dark" });
});

describe("SettingsPage", () => {
  it("görünüm ve dil bölümleri render edilir", () => {
    renderPage();
    expect(screen.getByText("Görünüm")).toBeTruthy();
    expect(screen.getByText("Dil")).toBeTruthy();
  });

  it("tema bölümü 'yakında' notunu gösterir", () => {
    renderPage();
    expect(screen.getByText("Tema desteği yakında")).toBeTruthy();
  });

  it("EN seçilince locale değişir ve çeviri EN'e geçer", () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "English" }));
    expect(useSettingsStore.getState().locale).toBe("en");
    // Çeviri provider'ı EN'e geçti — bölüm etiketleri İngilizce olur
    expect(screen.getByText("Appearance")).toBeTruthy();
    expect(screen.getByText("Language")).toBeTruthy();
  });

  it("TR seçilince locale tr'ye döner", () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "English" }));
    fireEvent.click(screen.getByRole("button", { name: "Türkçe" }));
    expect(useSettingsStore.getState().locale).toBe("tr");
  });
});
