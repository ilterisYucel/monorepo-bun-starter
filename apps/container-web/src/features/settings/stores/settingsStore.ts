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

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      locale: "tr",
      theme: "dark",
      setLocale: (locale) => set({ locale }),
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: "app-settings",
      version: 1,
    },
  ),
);
