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
            background: "#1f1f2e",
            color: "#e0e0e0",
            border: "1px solid #2a2a3a",
            fontFamily: "monospace",
            fontSize: "13px",
          },
        }}
      />
    </ErrorBoundary>
  );
};
