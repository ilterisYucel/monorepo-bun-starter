import { randomBytes } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import type { SessionTokenPayload } from "@gd-monorepo/ws-tunnel";

/**
 * Agent oturum token'ı imzalayıcı — production (HS256).
 *
 * Hub oturum cookie'sini opak taşır; imza secret'ı agent kurulumunda rastgele
 * üretilir (`HUB_SECRET`). Test helper'ı (`JoseSignerForTests`) agent'ta
 * KULLANILMAZ (K4).
 */

/** 32 byte rastgele secret (hex) üretir. */
export function generateSecret(): string {
  return randomBytes(32).toString("hex");
}

export async function signAgentToken(
  secret: string,
  payload: SessionTokenPayload,
  expiresInSec: number,
): Promise<string> {
  return new SignJWT({ ...payload, type: "container-session" as const })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(Math.floor(Date.now() / 1000) + expiresInSec)
    .sign(new TextEncoder().encode(secret));
}

/** Token'ı doğrular; geçersiz/tahrif/süresi geçmiş → undefined. */
export async function verifyAgentToken(
  secret: string,
  token: string,
): Promise<SessionTokenPayload | undefined> {
  try {
    const { payload } = await jwtVerify<SessionTokenPayload & { type?: string }>(
      token,
      new TextEncoder().encode(secret),
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
