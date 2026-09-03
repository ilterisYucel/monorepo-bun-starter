import { test, expect, type Page } from "@playwright/test";

/**
 * NIS-2 (2026-08-30 T5) — alarm uçları E2E kanıtı (Faz 0 eki KE):
 * - GET /api/unified/alarms admin token'ıyla 200 döner (yapı: liste).
 * - POST /api/unified/alarms/resolve aktif OLMAYAN alarmda 409 döner
 *   (yalnız aktif alarm çözülebilir — TEİAŞ resolved akışı).
 * - Guest token'ı resolve'a 403 alır (yetki matrisi E2E'de de korunur).
 *
 * Ön koşul: field dev stack'i.
 */

const FIELD_API = process.env.FIELD_API_URL || "http://localhost:5002";

async function login(page: Page, username: string): Promise<string> {
  const res = await page.request.post(`${FIELD_API}/api/auth/login`, {
    data: {
      username,
      password: process.env.E2E_ADMIN_PASSWORD || "kurulum-yeni-sifre-456",
    },
  });
  expect([200, 201]).toContain(res.status());
  const body = await res.json();
  return body.accessToken as string;
}

test.describe("NIS-2 güvenlik — alarm uçları (KE)", () => {
  test.describe.configure({ timeout: 60_000 });

  test("GET /api/unified/alarms yetkili kullanıcıya liste döner", async ({
    page,
  }) => {
    const token = await login(page, "admin");
    const res = await page.request.get(`${FIELD_API}/api/unified/alarms`, {
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(200);
    expect(Array.isArray(await res.json())).toBe(true);
  });

  test("aktif olmayan alarm çözümlemesi 409 döner (TEİAŞ resolved sözleşmesi)", async ({
    page,
  }) => {
    const token = await login(page, "admin");
    const res = await page.request.post(`${FIELD_API}/api/unified/alarms/resolve`, {
      headers: { authorization: `Bearer ${token}` },
      data: { deviceId: "BSC-1", alarmName: "olmayan-alarm" },
    });
    expect(res.status()).toBe(409);
  });

  test("guest alarm çözümleyemez (403 — yetki matrisi)", async ({ page }) => {
    const token = await login(page, "guest");
    const res = await page.request.post(`${FIELD_API}/api/unified/alarms/resolve`, {
      headers: { authorization: `Bearer ${token}` },
      data: { deviceId: "BSC-1", alarmName: "x" },
    });
    expect(res.status()).toBe(403);
  });
});
