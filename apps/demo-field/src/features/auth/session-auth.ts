// apps/field/src/features/auth/session-auth.ts
import { apiBaseUrl, isTunnelMode } from "../../lib/api-base";
import { useAuthStore } from "./stores/AuthStore";
import type { User } from "@gd-monorepo/shared-types";

/**
 * Boss Faz 3 — tünel modu oturum hydrate'i (container-web session-auth deseni):
 * - Tünel modunda (SPA /fields/:fid/ui altında) `GET /api/auth/session` ile
 *   kullanıcı hydrate edilir — login ekranı GÖRÜNMEZ.
 * - `field_session` cookie'si (HttpOnly, Path-scoped) isteği otomatik taşır;
 *   field web-service rbac hook'u cookie'yi doğrulayıp kullanıcıyı çözer.
 * - localStorage'a ASLA yazılmaz (boss origin izolasyonu).
 * - 401/hatada tünel başlatılmaz (false) — guard ekranı kalır.
 */

interface SessionResponse {
  user: User;
  tunnel: boolean;
}

/** Tünel oturumunu hydrate eder — başarılıysa true. */
export async function hydrateSessionAuth(): Promise<boolean> {
  if (!isTunnelMode()) return false;
  try {
    const res = await fetch(`${apiBaseUrl()}/auth/session`, {
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) return false;
    const body = (await res.json()) as SessionResponse;
    if (!body.user || !body.tunnel) return false;
    useAuthStore.getState().applySession(body.user);
    return true;
  } catch {
    return false;
  }
}
