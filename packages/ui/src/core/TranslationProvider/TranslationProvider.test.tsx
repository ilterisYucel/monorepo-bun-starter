import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  TranslationProvider,
  useTranslation,
} from "./TranslationProvider";

/**
 * TranslationProvider sözleşmesi (2026-08-30 — T4):
 * - t(key): sözlükten çeviri; eksik anahtar → anahtarın KENDİSİ (fallback).
 * - t(key, params): {param} interpolasyonu.
 * - extraKeys uygulama sözlüğü UI sözlüğünü OVERRIDE eder.
 * - setLocale: dil değiştirir (asenkron destekli) ve locale() yansıtır.
 * - Provider dışında useTranslation HATA fırlatır.
 */

const dicts = {
  tr: { "hello": "Merhaba", "greet": "Selam {name}", "shared": "TR-ortak" },
  en: { "hello": "Hello", "greet": "Hi {name}", "shared": "EN-common" },
};

function Probe() {
  const { t, locale, setLocale } = useTranslation();
  return (
    <div>
      <span data-testid="hello">{t("hello")}</span>
      <span data-testid="greet">{t("greet", { name: "Kanka" })}</span>
      <span data-testid="shared">{t("shared")}</span>
      <span data-testid="missing">{t("yok.anahtar")}</span>
      <span data-testid="loc">{locale()}</span>
      <button onClick={() => void setLocale("en")}>EN</button>
    </div>
  );
}

function renderProvider(extraKeys?: Record<string, Record<string, string>>) {
  return render(
    <TranslationProvider
      dictionaries={{ tr: dicts.tr, en: dicts.en }}
      defaultLocale="tr"
      extraKeys={extraKeys as never}
    >
      <Probe />
    </TranslationProvider>,
  );
}

describe("TranslationProvider (T4)", () => {
  it("varsayılan dilde çeviri + interpolasyon", () => {
    renderProvider();
    expect(screen.getByTestId("hello").textContent).toBe("Merhaba");
    expect(screen.getByTestId("greet").textContent).toBe("Selam Kanka");
    expect(screen.getByTestId("loc").textContent).toBe("tr");
  });

  it("eksik anahtar anahtarın kendisini döner (fallback)", () => {
    renderProvider();
    expect(screen.getByTestId("missing").textContent).toBe("yok.anahtar");
  });

  it("extraKeys uygulama anahtarları UI sözlüğünü override eder", () => {
    renderProvider({ tr: { shared: "UYGULAMA-ortak" } });
    expect(screen.getByTestId("shared").textContent).toBe("UYGULAMA-ortak");
  });

  it("setLocale dili değiştirir", async () => {
    renderProvider();
    fireEvent.click(screen.getByText("EN"));
    expect(screen.getByTestId("hello").textContent).toBe("Hello");
    expect(screen.getByTestId("loc").textContent).toBe("en");
  });

  it("Provider dışında useTranslation hata fırlatır", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Probe />)).toThrow();
    spy.mockRestore();
  });
});
