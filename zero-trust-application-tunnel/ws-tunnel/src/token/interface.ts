import type { TunnelRole } from "../types";

/** Oturum JWT payload'ı — `sessionId` + konteyner kullanıcısı. */
export interface SessionTokenPayload {
  sessionId: string;
  sub: string;
  username: string;
  role: TunnelRole;
}

/**
 * ITokenSigner — oturum JWT imzalama/doğrulama sözleşmesi (jenerik).
 * Monorepo implementasyonu: jose tabanlı `JoseTokenSigner` (web-service,
 * `type:"container-session"` etiketiyle).
 */
export interface ITokenSigner {
  sign(payload: SessionTokenPayload, expiresInSec: number): Promise<string>;
  verify(token: string): Promise<SessionTokenPayload | undefined>;
}
