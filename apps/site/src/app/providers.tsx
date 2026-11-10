import { QueryClientProvider } from "@tanstack/react-query";
import React, { Component, useMemo } from "react";
import { Toaster } from "react-hot-toast";
import { RouterProvider } from "react-router-dom";
import { COLORS, TR_DICT, EN_DICT, TranslationProvider, useTranslation } from "@gd-monorepo/ui";
import { queryClient } from "../lib/query-client";
import { router } from "./router";
import { FIELD_TR_DICT } from "../i18n/tr";
import { FIELD_EN_DICT } from "../i18n/en";
import { useSettingsStore } from "../features/settings/stores/settingsStore";

const TranslationWrapper: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // 2026-08-30: dil tercihi settingsStore'dan okunur (persist: "field-settings")
  // — değişiklik SettingsPage üzerinden yapılır.
  const locale = useSettingsStore((s) => s.locale);
  const dicts = useMemo(
    () => ({ tr: TR_DICT, en: EN_DICT }),
    [],
  );
  const extraKeys = useMemo(
    () => ({ tr: FIELD_TR_DICT, en: FIELD_EN_DICT }),
    [],
  );
  return (
    <TranslationProvider dictionaries={dicts} defaultLocale={locale} extraKeys={extraKeys}>
      {children}
    </TranslationProvider>
  );
};

const ErrorFallback: React.FC<{ error: Error | null }> = ({ error }) => {
  const { t } = useTranslation();
  return (
    <div style={{ padding: "2rem", color: COLORS.error }}>
      <h2>{t("common.errorTitle")}</h2>
      <pre>{error?.message}</pre>
      <button
        onClick={() => window.location.reload()}
        style={{ marginTop: "1rem", padding: "8px 16px" }}
      >
        {t("common.reload")}
      </button>
    </div>
  );
};

class ErrorBoundary extends Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} />;
    }
    return this.props.children;
  }
}

export const AppProviders: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <QueryClientProvider client={queryClient}>
    <TranslationWrapper>
      <ErrorBoundary>
        <RouterProvider router={router} />
        {children}
      </ErrorBoundary>
    </TranslationWrapper>
    <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
  </QueryClientProvider>
);
