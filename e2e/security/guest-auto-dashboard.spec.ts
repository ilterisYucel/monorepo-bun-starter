import { test, expect, type Page } from "@playwright/test";

/**
 * AUTH-REFRESH 2026-09-23 — K1 E2E kanıtı (auto-guest KALDIRILDI):
 * - Field uygulamasına HİÇBİR token olmadan gidildiğinde LOGIN EKRANI
 *   görünür — otomatik guest girişi YOKTUR (2026-08-30 davranışının tersi).
 * - Refresh ölümü = login ekranı (K1); guest fallback YALNIZCA
 *   container-web'dedir.
 *
 * Ön koşul: field dev stack'i (FIELD_UI_URL).
 */

const FIELD_UI = process.env.FIELD_UI_URL || "http://localhost:5174";
const FIELD_ID = process.env.FIELD_ID || "5d5e49dc-7757-4f3e-a026-0263c2966bc6";

async function clearTokens(page: Page): Promise<void> {
  await page.goto(`${FIELD_UI}/login`);
  await page.evaluate(() => {
    localStorage.removeItem("auth-token");
    localStorage.removeItem("auth-refresh-token");
    localStorage.removeItem("field-auth-storage");
  });
}

test.describe("Auto-guest YOK — K1 (AUTH-REFRESH)", () => {
  test.describe.configure({ timeout: 60_000 });

  test("token'sız açılışta LOGIN ekranı görünür (guest denenmez)", async ({
    page,
  }) => {
    await clearTokens(page);
    await page.goto(`${FIELD_UI}/field/${FIELD_ID}`);
    // K1: auto-guest KALDIRILDI — korumalı rota login'e düşer.
    await page.waitForURL(/\/login/, { timeout: 15000 });
    await expect(
      page.getByPlaceholder("Kullanıcı adı"),
    ).toBeVisible({ timeout: 10000 });
  });

  test("token'sız doğrudan /login açılır (login formu render)", async ({
    page,
  }) => {
    await clearTokens(page);
    await page.goto(`${FIELD_UI}/login`);
    await expect(
      page.getByPlaceholder("Kullanıcı adı"),
    ).toBeVisible({ timeout: 10000 });
    await expect(page.getByPlaceholder("Şifre")).toBeVisible();
  });
});
