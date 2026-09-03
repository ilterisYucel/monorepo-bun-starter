import { SignJWT, jwtVerify } from "jose";
import type { ITokenSigner, SessionTokenPayload } from "../../token";

/**
 * JoseSignerForTests — ws-tunnel paket içi test yardımcısı (jose devDependency).
 * Monorepo üretim implementasyonuyla birebir davranış: `type:"container-session"`
 * etiketi eklenir, doğrulamada etiket kontrol edilir, tahrifli token undefined.
 */
export class JoseSignerForTests implements ITokenSigner {
  private readonly secret: Uint8Array;

  constructor(secret: string) {
    this.secret = new TextEncoder().encode(secret);
  }

  async sign(payload: SessionTokenPayload, expiresInSec: number): Promise<string> {
    return new SignJWT({ ...payload, type: "container-session" as const })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime(Math.floor(Date.now() / 1000) + expiresInSec)
      .sign(this.secret);
  }

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
