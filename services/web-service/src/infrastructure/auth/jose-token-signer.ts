import { SignJWT, jwtVerify } from "jose";
import type { ITokenSigner, SessionTokenPayload } from "@gd-monorepo/ws-tunnel";

/**
 * JoseTokenSigner — ws-tunnel `ITokenSigner` sözleşmesinin jose implementasyonu
 * (web-service, container tier). Konteynerin KENDİ JWT_SECRET'iyle imzalanır —
 * field içeriğini görmez, secret paylaşımı yoktur. `type:"container-session"`
 * etiketi access token'larla karışmayı önler (TokenAdapter.verifyAccess reddeder).
 */
export class JoseTokenSigner implements ITokenSigner {
  private readonly secret: Uint8Array;

  constructor(secret: string) {
    this.secret = new TextEncoder().encode(secret);
  }

  /** Oturum JWT'si üretir — TTL `expiresInSec` saniyedir. */
  async sign(payload: SessionTokenPayload, expiresInSec: number): Promise<string> {
    return new SignJWT({ ...payload, type: "container-session" as const })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime(Math.floor(Date.now() / 1000) + expiresInSec)
      .sign(this.secret);
  }

  /** Token'ı doğrular — geçersiz/tahrifli ise undefined (sorgu, throw yok). */
  async verify(token: string): Promise<SessionTokenPayload | undefined> {
    try {
      const { payload } = await jwtVerify<SessionTokenPayload & { type?: string }>(
        token,
        this.secret,
      );
      if (payload.type !== "container-session") return undefined;
      return {
        sessionId: payload.sessionId,
        sub: payload.sub,
        username: payload.username,
        role: payload.role,
      };
    } catch {
      return undefined;
    }
  }
}
