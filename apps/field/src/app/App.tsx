import React, { useEffect, useRef } from "react";
import { AppProviders } from "./providers";
import { useAuthStore } from "../features/auth/stores/AuthStore";

/**
 * GuestBootstrap — otomatik misafir girişi (2026-08-30):
 * uygulama açılışında hiç token yoksa varsayılan guest hesabıyla giriş
 * denenir (manuel misafir girişi yoktur). Başarısızlıkta unauthenticated
 * kalınır — FieldShell login'e yönlendirir (backend yok senaryosu).
 */
const GuestBootstrap: React.FC = () => {
  const loginAsGuest = useAuthStore((s) => s.loginAsGuest);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const attempted = useRef(false);

  useEffect(() => {
    if (attempted.current) return;
    attempted.current = true;
    const token = localStorage.getItem("auth-token");
    if (!token && !isAuthenticated) {
      void loginAsGuest();
    }
  }, [loginAsGuest, isAuthenticated]);

  return null;
};

export const App: React.FC = () => (
  <AppProviders>
    <GuestBootstrap />
  </AppProviders>
);
