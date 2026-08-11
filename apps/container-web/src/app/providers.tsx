// apps/web/src/app/providers.tsx
import React, { useEffect, useMemo } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { queryClient } from "../lib/query-client";
import { router } from "./router";
import { useAuthStore } from "../features/auth/stores/AuthStore";
import { TransportProvider } from "../contexts/TransportContext";
import { RealtimeProvider } from "../contexts/RealtimeContext";
import { COLORS, TR_DICT, EN_DICT, TranslationProvider } from "@gd-monorepo/ui";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { useSettingsStore } from "../features/settings/stores/settingsStore";
import { APP_TR_DICT } from "../i18n/tr";
import { APP_EN_DICT } from "../i18n/en";

export const TranslationWrapper: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const locale = useSettingsStore((s) => s.locale);
  const dicts = useMemo(
    () => ({ tr: TR_DICT, en: EN_DICT }),
    [],
  );
  const extraKeys = useMemo(
    () => ({ tr: APP_TR_DICT, en: APP_EN_DICT }),
    [],
  );
  return (
    <TranslationProvider
      dictionaries={dicts}
      defaultLocale={locale}
      extraKeys={extraKeys}
    >
      {children}
    </TranslationProvider>
  );
};

export const AppProviders: React.FC = () => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const loginAsGuest = useAuthStore((s) => s.loginAsGuest);

  useEffect(() => {
    if (!isAuthenticated) {
      loginAsGuest();
    }
  }, [isAuthenticated, loginAsGuest]);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TranslationWrapper>
          <TransportProvider>
            <RealtimeProvider>
              <RouterProvider router={router} />
            </RealtimeProvider>
          </TransportProvider>
        </TranslationWrapper>
      </QueryClientProvider>
      <Toaster
        position="bottom-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: COLORS.bgPopup,
            color: COLORS.textLight,
            border: `1px solid ${COLORS.borderDefault}`,
            fontFamily: "var(--mono)",
            fontSize: "13px",
          },
        }}
      />
    </ErrorBoundary>
  );
};
