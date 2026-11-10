import { create } from "zustand";
import { persist } from "zustand/middleware";

export type AppLocale = "tr" | "en";
export type AppTheme = "dark" | "light";

interface SettingsState {
  locale: AppLocale;
  theme: AppTheme;
  setLocale: (locale: AppLocale) => void;
  setTheme: (theme: AppTheme) => void;
}

/**
 * settingsStore — field uygulama tercihleri (2026-08-30):
 * dil seçimi (çalışır) + tema seçimi (dark/light — tema altyapısı henüz
 * implemente edilmediği için seçim UI'da "yakında" olarak işaretlenir).
 * persist key: "field-settings".
 */
export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      locale: "tr",
      theme: "dark",
      setLocale: (locale) => set({ locale }),
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: "field-settings",
      version: 1,
    },
  ),
);
