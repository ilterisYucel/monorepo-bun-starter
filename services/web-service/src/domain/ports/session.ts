import type { User } from "@gd-monorepo/shared-types";

/**
 * Oturum doğrulama portu (domain) — SPEC WEB-SERVICE-KATMANLAMA UC-7/K15.
 *
 * - `authenticate(cookieHeader)`: cookie'den token çözüp doğrular.
 * - `authenticateToken(token)`: cookie'siz yollar (WS query token).
 * - Geçersiz/süresi geçmiş → `undefined` (fail-closed).
 */
export interface ISessionAuthenticator {
  authenticate(cookieHeader: string | undefined): Promise<User | undefined>;
  authenticateToken(token: string): Promise<User | undefined>;
}
