import React, { useEffect, useRef } from "react";
import { AppProviders } from "./providers";
import { isTunnelMode } from "../lib/api-base";
import { hydrateSessionAuth } from "../features/auth/session-auth";

/**
 * TunnelBootstrap (AUTH-REFRESH 2026-09-23 — UC-2):
 * - Tünel modunda (boss iframe'i) `field_session` cookie'sinden oturum
 *   hydrate edilir — login formu AÇILMAZ.
 * - Standalone modda no-op: auto-guest KALDIRILDI (K1) — kullanıcı login
 *   ekranından girer; FieldShell guard'ı kimliksiz açılışı /login'e düşürür.
 */
export const TunnelBootstrap: React.FC = () => {
  const attempted = useRef(false);

  useEffect(() => {
    if (attempted.current) return;
    attempted.current = true;
    if (isTunnelMode()) {
      void hydrateSessionAuth();
    }
  }, []);

  return null;
};

export const App: React.FC = () => (
  <AppProviders>
    <TunnelBootstrap />
  </AppProviders>
);
