import React from "react";
import { useTranslation } from "@gd-monorepo/ui";
import {
  useSettingsStore,
} from "../features/settings/stores/settingsStore";
import type { AppLocale, AppTheme } from "../features/settings/stores/settingsStore";
import * as S from "./SettingsPage.styles";

/**
 * SettingsPage — saha uygulama ayarları (2026-08-30):
 * - Dil seçimi (tr/en) ÇALIŞIR: settingsStore + TranslationProvider senkron.
 * - Tema seçimi (dark/light): tema altyapısı henüz implemente edilmediği için
 *   no-op'tur ("yakında") — container-web ile aynı davranış.
 */
export const SettingsPage: React.FC = () => {
  const { t, setLocale: setTranslation } = useTranslation();
  const { locale, theme, setLocale, setTheme } = useSettingsStore();

  const handleLocaleChange = (l: AppLocale) => {
    setLocale(l);
    setTranslation(l);
  };

  const handleThemeChange = (_theme: AppTheme) => {
    // ELEGANT-EXCEPTION: dark/light tema altyapısı henüz implemente edilmedi —
    // seçim UI'ı hazırdır, davranış tema desteği geldiğinde setTheme(_theme)
    // olacak (2026-08-30 planı: settings'te toggle, şimdilik no-op).
    void setTheme;
  };

  return (
    <S.Page>
      <S.Section>
        <S.SectionLabel>{t("settings.appearance")}</S.SectionLabel>
        <S.ToggleGroup>
          <S.ToggleBtn
            active={theme === "dark"}
            onClick={() => handleThemeChange("dark")}
          >
            {t("settings.theme.dark")}
          </S.ToggleBtn>
          <S.ToggleBtn
            active={theme === "light"}
            onClick={() => handleThemeChange("light")}
          >
            {t("settings.theme.light")}
          </S.ToggleBtn>
        </S.ToggleGroup>
        <S.ComingSoon>{t("settings.theme.comingSoon")}</S.ComingSoon>
      </S.Section>

      <S.Section>
        <S.SectionLabel>{t("settings.language")}</S.SectionLabel>
        <S.ToggleGroup>
          <S.ToggleBtn
            active={locale === "tr"}
            onClick={() => handleLocaleChange("tr")}
          >
            Türkçe
          </S.ToggleBtn>
          <S.ToggleBtn
            active={locale === "en"}
            onClick={() => handleLocaleChange("en")}
          >
            English
          </S.ToggleBtn>
        </S.ToggleGroup>
      </S.Section>
    </S.Page>
  );
};
