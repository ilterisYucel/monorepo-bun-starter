import { test, expect, type Page } from "@playwright/test";

/**
 * NIS-2 (2026-08-30 T5) — TOTP deneme kilidi E2E kanıtı (T1.6 mekanizması).
 *
 * Şifre adımı geçildikten sonra /api/auth/login/mfa'ya ART ARDA yanlış kod
 * gönderilir; totpMaxFailures (varsayılan 5) aşılınca 6. deneme 429
 * "MFA dogrulamasi gecici kilitli" döner (brute-force koruması — ASVS V3.5.2).
 *
 * Ön koşul: field dev stack'i + MFA zorunluluğu AÇIK (admin kayıtlı).
 */

const FIELD_API = process.env.FIELD_API_URL || "http://localhost:5002";

async function mfaLoginToken(page: Page): Promise<string> {
  const res = await page.request.post(`${FIELD_API}/api/auth/login`, {
    data: { username: "admin", password: process.env.E2E_ADMIN_PASSWORD || "kurulum-yeni-sifre-456" },
  });
  expect([200, 201]).toContain(res.status());
  const body = await res.json();
  expect(body.mfaRequired).toBe(true);
  return body.mfaToken as string;
}

test.describe("NIS-2 güvenlik — TOTP deneme kilidi (T1.6)", () => {
  test.describe.configure({ timeout: 60_000 });

  test("5 yanlış kod sonrası 6. deneme 429 ile kilitlenir @nis2-security", async ({
    page,
  }) => {
    const mfaToken = await mfaLoginToken(page);

    for (let i = 1; i <= 5; i += 1) {
      const res = await page.request.post(`${FIELD_API}/api/auth/login/mfa`, {
        data: { mfaToken, code: "000000" },
      });
      expect(res.status()).toBe(401);
    }

    const locked = await page.request.post(`${FIELD_API}/api/auth/login/mfa`, {
      data: { mfaToken, code: "000000" },
    });
    expect(locked.status()).toBe(429);
    expect(await locked.json()).toMatchObject({
      error: "MFA dogrulamasi gecici kilitli",
    });
  });
});
