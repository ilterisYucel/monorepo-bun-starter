import React, { useMemo } from "react";
import { SCADA_ICONS, Tabs } from "@gd-monorepo/ui";
import type { TabItem } from "@gd-monorepo/ui";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useTranslation } from "@gd-monorepo/ui";
import { useSettingsStore } from "../stores/settingsStore";
import type { AppLocale, AppTheme } from "../stores/settingsStore";
import { useUserList } from "../hooks/useUserManagement";
import { UserList } from "./UserList";
import { UserCreateForm } from "./UserCreateForm";
import * as S from "./SettingsPanel.styles";

interface SettingsPanelProps {
  onClose: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ onClose }) => {
  const { isAdmin } = useAuth();
  const { locale, theme, setLocale, setTheme } = useSettingsStore();
  const { t, setLocale: setTranslation } = useTranslation();
  const userList = useUserList();
  const CloseIcon = SCADA_ICONS.close;

  const handleLocaleChange = (l: AppLocale) => {
    setLocale(l);
    setTranslation(l);
  };

  const handleThemeChange = (_theme: AppTheme) => {
    // ELEGANT-EXCEPTION: Dark/light tema henüz implemente edilmedi
  };

  const tabs = useMemo<TabItem[]>(() => [
    {
      key: "options",
      label: t("settings.tab.options"),
      content: (
        <>
          <S.Section>
            <S.SectionLabel>{t("settings.appearance")}</S.SectionLabel>
            <S.ToggleGroup>
              <S.ToggleBtn
                active={theme === "dark"}
                onClick={() => handleThemeChange("dark")}
              >
                🌙 {t("settings.theme.dark")}
              </S.ToggleBtn>
              <S.ToggleBtn
                active={theme === "light"}
                onClick={() => handleThemeChange("light")}
              >
                ☀️ {t("settings.theme.light")}
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
                🇹🇷 {t("settings.lang.tr")}
              </S.ToggleBtn>
              <S.ToggleBtn
                active={locale === "en"}
                onClick={() => handleLocaleChange("en")}
              >
                🇬🇧 {t("settings.lang.en")}
              </S.ToggleBtn>
            </S.ToggleGroup>
          </S.Section>
        </>
      ),
    },
    {
      key: "users",
      label: t("settings.tab.users"),
      visible: isAdmin,
      content: (
        <S.Section>
          <UserList
            users={userList.data ?? []}
            isLoading={userList.isLoading}
            isError={userList.isError}
          />
          <UserCreateForm />
        </S.Section>
      ),
    },
  ], [t, theme, locale, isAdmin, userList]);

  return (
    <S.Overlay onClick={onClose}>
      <S.Panel onClick={(e) => e.stopPropagation()}>
        <S.Header>
          <S.Title>{t("settings.title")}</S.Title>
          <S.CloseBtn onClick={onClose}>
            <CloseIcon size={20} />
          </S.CloseBtn>
        </S.Header>

        <Tabs tabs={tabs} defaultKey="options" />
      </S.Panel>
    </S.Overlay>
  );
};
