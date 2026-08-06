// apps/web/src/app/providers.tsx
import React, { useEffect } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { queryClient } from "../lib/query-client";
import { router } from "./router";
import { useAuthStore } from "../features/auth/stores/AuthStore";
import { TransportProvider } from "../contexts/TransportContext";
import { RealtimeProvider } from "../contexts/RealtimeContext";
import { COLORS } from "@gd-monorepo/ui";
import { ErrorBoundary } from "../components/ErrorBoundary";

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
        <TransportProvider>
          <RealtimeProvider>
            <RouterProvider router={router} />
          </RealtimeProvider>
        </TransportProvider>
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
