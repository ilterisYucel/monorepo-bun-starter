// apps/web/src/app/providers.tsx
import React, { useEffect } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";
import { queryClient } from "../lib/query-client";
import { router } from "./router";
import { useAuthStore } from "../features/auth/stores/AuthStore";

export const AppProviders: React.FC = () => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const loginAsGuest = useAuthStore((s) => s.loginAsGuest);

  useEffect(() => {
    if (!isAuthenticated) {
      loginAsGuest();
    }
  }, [isAuthenticated, loginAsGuest]);

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
};
