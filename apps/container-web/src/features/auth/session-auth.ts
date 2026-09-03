// apps/container-web/src/features/auth/session-auth.ts
import { apiBaseUrl, isTunnelMode } from "../../lib/api-base";
import { useAuthStore } from "./stores/AuthStore";
import type { User } from "./types/user";

/**
 * Faz 4 T4.4 — tünel modu oturum hydrate'i (tasarım §5.4):
 * - Tünel modunda (SPA subpath'te) `GET /api/auth/session` ile kullanıcı
 *   hydrate edilir — login ekranı GÖRÜNMEZ (K4.2). Cookie (HttpOnly) isteği
 *   otomatik taşır.
 * - Cookie, istekleri otomatik taşır (Path-scoped, aynı origin iframe).
 * - localStorage'a ASLA yazılmaz (kırılganlık #1 izolasyonu — field'ın
 *   token'ları ezilmez); AuthStore tünel modunda no-op persist kullanır.
 * - 401/hatada tünel başlatılmaz (false) — normal login akışı korunur.
 */

interface SessionResponse {
  user: User;
  tunnel: boolean;
}

/** Tünel oturumunu hydrate eder — başarılıysa true (komut). */
export async function hydrateSessionAuth(): Promise<boolean> {
  // HttpOnly cookie JS'ten görünmez — tünel tespiti pathname'den (T4.4).
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
