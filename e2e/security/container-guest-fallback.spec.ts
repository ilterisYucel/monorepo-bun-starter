import { test, expect, type Page } from "@playwright/test";

/**
 * AUTH-REFRESH 2026-09-23 — AK-5.3 regresyon kanıtı:
 * container-web DEĞİŞMEDİ (K1) — refresh başarısız olduğunda guest
 * fallback ile DASHBOARD'da kalır; login ekranına düşmez.
 *
 * Tetikleme: refresh token localStorage'da bozulur → access süresi dolunca
 * 401-refresh → refresh 401 → clearAuthState + reLoginAsGuest → dashboard.
 *
 * Ön koşul: container dev stack'i kısa access TTL ile (A1):
 *   ACCESS_TOKEN_EXPIRY_SECONDS=10 (web-service env).
 *   Yoksa E2E_SHORT_TTL=1 işaretiyle skip.
 */

const CONTAINER_UI = process.env.CONTAINER_UI_URL || "http://localhost:5173";
const SHORT_TTL = process.env.E2E_SHORT_TTL === "1";
const TTL_SECONDS = Number(process.env.E2E_ACCESS_TOKEN_TTL_SECONDS || 10);

async function loginContainer(page: Page): Promise<void> {
  await page.goto(`${CONTAINER_UI}/#/login`);
  await page.getByPlaceholder("admin", { exact: true }).fill("admin");
  await page.getByPlaceholder("admin123", { exact: true }).fill(
    process.env.E2E_ADMIN_PASSWORD || "kurulum-yeni-sifre-456",
  );
  await page.locator("button[type='submit']").click();
  await page.waitForTimeout(2000);
}

test.describe("Container-web guest fallback regresyonu (AK-5.3)", () => {
  test.describe.configure({ timeout: 120_000 });

  test("refresh başarısız → guest fallback → dashboard KALIR (login'e düşmez)", async ({
    page,
  }) => {
    test.skip(!SHORT_TTL, "A1: kısa access TTL stack'i gerekli (E2E_SHORT_TTL=1)");
    await loginContainer(page);

    // Refresh token'ı boz — access dolunca refresh 401 alır.
    await page.evaluate(() => {
      localStorage.setItem("auth-refresh-token", "bozuk-refresh-token");
    });

    // Access token dolana kadar bekle (kısa TTL) — sonra bir API tetikle.
    await page.waitForTimeout((TTL_SECONDS + 5) * 1000);
    await page.reload();

    // K1: guest fallback — login ekranına DÜŞMEZ, dashboard kalır.
    await page.waitForTimeout(5000);
    expect(page.url()).not.toContain("/#/login");
    expect(page.url()).not.toContain("/login");
  });
});
