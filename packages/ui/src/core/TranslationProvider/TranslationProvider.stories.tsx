import type { Meta, StoryObj } from "@storybook/react";
import React from "react";
import { TranslationProvider, useTranslation } from "./TranslationProvider";
import { TR_DICT, EN_DICT } from "../../i18n";
import { COLORS } from "../../colors";

const meta: Meta<typeof TranslationProvider> = {
  title: "Core/TranslationProvider",
  component: TranslationProvider,
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof TranslationProvider>;

const LocaleSwitcher: React.FC = () => {
  const { t, locale, setLocale } = useTranslation();
  return (
    <div
      style={{
        display: "flex",
        gap: 12,
        alignItems: "center",
        padding: 24,
        background: COLORS.bgCard,
        borderRadius: 12,
        color: COLORS.textPrimary,
      }}
    >
      <span style={{ color: COLORS.textMuted }}>Aktif dil: {locale}</span>
      <button onClick={() => setLocale(locale === "tr" ? "en" : "tr")}>Değiştir</button>
      <span>{t("status.connected")}</span>
      <span>{t("status.disconnected")}</span>
    </div>
  );
};

export const TrEnSwitch: Story = {
  render: () => (
    <TranslationProvider dictionaries={{ tr: TR_DICT, en: EN_DICT }} defaultLocale="tr">
      <LocaleSwitcher />
    </TranslationProvider>
  ),
};
