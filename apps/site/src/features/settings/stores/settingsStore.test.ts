import { describe, it, expect, beforeEach } from "vitest";
import { useSettingsStore } from "./settingsStore";

/**
 * settingsStore sözleşmesi (2026-08-30):
 * - Varsayılan: locale "tr", theme "dark".
 * - setLocale/setTheme state'i değiştirir ve persist eder.
 */

beforeEach(() => {
  localStorage.clear();
  useSettingsStore.setState({ locale: "tr", theme: "dark" });
});

describe("settingsStore", () => {
  it("varsayılan değerler tr/dark", () => {
    expect(useSettingsStore.getState().locale).toBe("tr");
    expect(useSettingsStore.getState().theme).toBe("dark");
  });

  it("setLocale dil değiştirir", () => {
    useSettingsStore.getState().setLocale("en");
    expect(useSettingsStore.getState().locale).toBe("en");
    useSettingsStore.getState().setLocale("tr");
    expect(useSettingsStore.getState().locale).toBe("tr");
  });

  it("setTheme tema değiştirir", () => {
    useSettingsStore.getState().setTheme("light");
    expect(useSettingsStore.getState().theme).toBe("light");
  });

  it("locale persist edilir", () => {
    useSettingsStore.getState().setLocale("en");
    const raw = localStorage.getItem("field-settings");
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw ?? "{}").state.locale).toBe("en");
  });
});
