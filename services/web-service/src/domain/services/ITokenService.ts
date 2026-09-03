import type { User } from "@gd-monorepo/shared-types";

export interface ITokenService {
  signAccess(user: User): Promise<string>;
  signRefresh(user: User): Promise<string>;
  verifyAccess(token: string): Promise<User>;
  verifyRefresh(token: string): Promise<{ sub: string; jti: string }>;
  /**
   * Faz 6 T6.1 — MFA giriş ara-adım token'ı (`type:"mfa"`, kısa TTL).
   * Şifre adımı geçildikten sonra üretilir; yalnızca `/api/auth/login/mfa`
   * ucu kabul eder — access/refresh yerine KULLANILAMAZ.
   */
  signMfa(userId: string): Promise<string>;
  /** Faz 6 T6.1 — mfa token'ı doğrular (süre + tip). Hata → throw. */
  verifyMfa(token: string): Promise<{ sub: string }>;
}
