import { SignJWT, jwtVerify } from "jose";
import type { ITokenSigner, SessionTokenPayload } from "@gd-monorepo/ws-tunnel";

/**
 * JoseTokenSigner — ws-tunnel `ITokenSigner` sözleşmesinin jose implementasyonu
 * (web-service). Client'ın KENDİ JWT_SECRET'iyle imzalanır — hub içeriğini
 * görmez, secret paylaşımı yoktur. `type` etiketi (varsayılan
 * `container-session`; boss uplink için `field-session`) access token'larla
 * ve diğer tünel katmanıyla karışmayı önler (A8).
 */
export class JoseTokenSigner implements ITokenSigner {
  private readonly secret: Uint8Array;
  private readonly tag: string;

  constructor(secret: string, tag: string = "container-session") {
    this.secret = new TextEncoder().encode(secret);
    this.tag = tag;
  }

  /** Oturum JWT'si üretir — TTL `expiresInSec` saniyedir. */
  async sign(payload: SessionTokenPayload, expiresInSec: number): Promise<string> {
    return new SignJWT({ ...payload, type: this.tag as const })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime(Math.floor(Date.now() / 1000) + expiresInSec)
      .sign(this.secret);
  }

  /** Token'ı doğrular — geçersiz/tahrifli/yanlış etiketli ise undefined. */
  async verify(token: string): Promise<SessionTokenPayload | undefined> {
    try {
      const { payload } = await jwtVerify<SessionTokenPayload & { type?: string }>(
        token,
        this.secret,
      );
      if (payload.type !== this.tag) return undefined;
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
