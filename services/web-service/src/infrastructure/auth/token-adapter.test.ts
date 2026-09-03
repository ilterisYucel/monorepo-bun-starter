import { describe, it, expect } from "vitest";
import { SignJWT } from "jose";
import { TokenAdapter } from "./token-adapter";
import type { User } from "@gd-monorepo/shared-types";

/**
 * token-adapter sözleşmesi (Faz 1 T1.3):
 *
 * KARAKTERİZASYON (değişiklik öncesi, doğrulandı): access payload'da
 * fieldIds YOKTU — verifyAccess dönen User'da saha yetkisi kayboluyordu.
 * T1.3 ile fieldIds payload'a taşınır ve verifyAccess geri döndürür.
 *
 * 2026-08-30 — güvenlik ekleri (test-gelistirme-plani T1.2):
 * - Süresi dolmuş (exp) token reddedilir.
 * - YANLIŞ secret ile imzalanmış GEÇERLİ biçimli JWT reddedilir (sahte imza).
 * - Alg karıştırma: alg:none ve HS512 imzalı token'lar HS256 doğrulamasında
 *   reddedilir (jose — pinlenmiş HS256).
 * - mustChangePassword claim'i sign→verify round-trip korunur (rbac güvenir).
 */

const secret = new TextEncoder().encode("test-secret-123456789");

const config = {
  jwtSecret: "test-secret-123456789",
  accessTokenExpirySeconds: 900,
  refreshTokenExpirySeconds: 604800,
  mfaTokenExpirySeconds: 120,
  mfaRequiredRoles: ["admin", "teknik"],
  loginMaxFailures: 5,
  loginWindowSeconds: 900,
  loginLockSeconds: 900,
};

const user: User = {
  id: "u-1",
  username: "teknikci",
  role: "teknik",
  name: "Teknik Kisi",
  fieldIds: ["f-1", "f-2"],
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

function base64url(value: string): string {
  return Buffer.from(value).toString("base64url");
}

function unsignedJwt(payload: Record<string, unknown>): string {
  const header = base64url(JSON.stringify({ alg: "none", typ: "JWT" }));
  const body = base64url(JSON.stringify(payload));
  return `${header}.${body}.`;
}

describe("token-adapter karakterizasyon (mevcut davranış) @nis2-security", () => {
  it("signAccess → verifyAccess round-trip kimliği korur", async () => {
    const adapter = new TokenAdapter(config);
    const token = await adapter.signAccess(user);
    const verified = await adapter.verifyAccess(token);
    expect(verified.id).toBe("u-1");
    expect(verified.username).toBe("teknikci");
    expect(verified.role).toBe("teknik");
    expect(verified.name).toBe("Teknik Kisi");
  });

  it("verifyAccess başarısız token'da fırlatır", async () => {
    const adapter = new TokenAdapter(config);
    await expect(adapter.verifyAccess("bogus.token.value")).rejects.toThrow();
  });

  it("refresh token'ı access olarak doğrulanamaz", async () => {
    const adapter = new TokenAdapter(config);
    const refresh = await adapter.signRefresh(user);
    await expect(adapter.verifyAccess(refresh)).rejects.toThrow();
  });

  it("verifyAccess fieldIds döndürür (T1.3)", async () => {
    const adapter = new TokenAdapter(config);
    const token = await adapter.signAccess(user);
    const verified = await adapter.verifyAccess(token);
    expect(verified.fieldIds).toEqual(["f-1", "f-2"]);
  });

  it("fieldIds'siz kullanıcıda alan undefined/boş kalır", async () => {
    const adapter = new TokenAdapter(config);
    const token = await adapter.signAccess({ ...user, fieldIds: undefined });
    const verified = await adapter.verifyAccess(token);
    expect(verified.fieldIds ?? []).toEqual([]);
  });

  it("verifyRefresh jti/sub döner", async () => {
    const adapter = new TokenAdapter(config);
    const refresh = await adapter.signRefresh(user);
    const payload = await adapter.verifyRefresh(refresh);
    expect(payload.sub).toBe("u-1");
    expect(payload.jti).toBeTruthy();
  });

  it("T6.1: mfaEnabled claim'i round-trip korunur", async () => {
    const adapter = new TokenAdapter(config);
    const token = await adapter.signAccess({ ...user, mfaEnabled: true });
    const verified = await adapter.verifyAccess(token);
    expect(verified.mfaEnabled).toBe(true);
  });

  it("T6.1: signMfa → verifyMfa sub döner; access olarak KULLANILAMAZ", async () => {
    const adapter = new TokenAdapter(config);
    const mfa = await adapter.signMfa("u-1");
    const payload = await adapter.verifyMfa(mfa);
    expect(payload.sub).toBe("u-1");
    // access doğrulaması mfa token'ı reddeder (tip kontrolü)
    await expect(adapter.verifyAccess(mfa)).rejects.toThrow();
  });

  it("T6.1: access token mfa olarak doğrulanamaz", async () => {
    const adapter = new TokenAdapter(config);
    const access = await adapter.signAccess(user);
    await expect(adapter.verifyMfa(access)).rejects.toThrow();
  });

  it("T6.1: bozuk mfa token fırlatır", async () => {
    const adapter = new TokenAdapter(config);
    await expect(adapter.verifyMfa("bogus")).rejects.toThrow();
  });
});

describe("token-adapter güvenlik ekleri (2026-08-30 — T1.2)", () => {
  it("süresi dolmuş (exp geçmiş) access token reddedilir", async () => {
    const adapter = new TokenAdapter({ ...config, accessTokenExpirySeconds: -1 });
    const token = await adapter.signAccess(user);
    await expect(adapter.verifyAccess(token)).rejects.toThrow();
  });

  it("YANLIŞ secret ile imzalanmış GEÇERLİ biçimli JWT reddedilir (sahte imza)", async () => {
    const adapter = new TokenAdapter(config);
    const forged = await new SignJWT({
      sub: "u-1",
      username: "teknikci",
      role: "teknik",
      name: "Teknik Kisi",
      type: "access",
    })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime(Math.floor(Date.now() / 1000) + 900)
      .sign(new TextEncoder().encode("saldirgan-secret"));
    await expect(adapter.verifyAccess(forged)).rejects.toThrow();
  });

  it("alg:none token reddedilir (algoritma karıştırma)", async () => {
    const adapter = new TokenAdapter(config);
    const noneToken = unsignedJwt({
      sub: "u-1",
      username: "teknikci",
      role: "teknik",
      name: "Teknik Kisi",
      type: "access",
      exp: Math.floor(Date.now() / 1000) + 900,
    });
    await expect(adapter.verifyAccess(noneToken)).rejects.toThrow();
  });

  it("HS512 ile imzalanmış token HS256 doğrulamasında reddedilir", async () => {
    const adapter = new TokenAdapter(config);
    const hs512 = await new SignJWT({
      sub: "u-1",
      username: "teknikci",
      role: "teknik",
      name: "Teknik Kisi",
      type: "access",
    })
      .setProtectedHeader({ alg: "HS512" })
      .setExpirationTime(Math.floor(Date.now() / 1000) + 900)
      .sign(secret);
    await expect(adapter.verifyAccess(hs512)).rejects.toThrow();
  });

  it("mustChangePassword claim'i sign→verify round-trip korunur (rbac güvenir)", async () => {
    const adapter = new TokenAdapter(config);
    const token = await adapter.signAccess({ ...user, mustChangePassword: true });
    const verified = await adapter.verifyAccess(token);
    expect(verified.mustChangePassword).toBe(true);

    const tokenFalse = await adapter.signAccess({ ...user, mustChangePassword: false });
    const verifiedFalse = await adapter.verifyAccess(tokenFalse);
    expect(verifiedFalse.mustChangePassword).toBe(false);
  });

  it("süresi dolmuş refresh token reddedilir", async () => {
    const adapter = new TokenAdapter({ ...config, refreshTokenExpirySeconds: -1 });
    const token = await adapter.signRefresh(user);
    await expect(adapter.verifyRefresh(token)).rejects.toThrow();
  });
});
