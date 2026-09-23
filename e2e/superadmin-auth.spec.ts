import { test, expect, type Page } from "@playwright/test";

/**
 * AUTH-REFRESH 2026-09-23 — superadmin (boss) auth E2E (UC-5):
 * - AK-5.2: logout → login ekranı.
 * - Kısa TTL testi (A1): access süresi dolunca otomatik refresh — dashboard
 *   kesintisiz (tek-uçuş refresh; tünel guard YOK).
 *
 * Ön koşul: boss dev stack'i (SUPERADMIN_UI_URL; web-service boss tier).
 * Zamanlama testleri için stack KISA access TTL ile kalkmalı (A1):
 *   ACCESS_TOKEN_EXPIRY_SECONDS=10 — yoksa E2E_SHORT_TTL=1 skip edilir.
 */

const BOSS_UI = process.env.SUPERADMIN_UI_URL || "http://localhost:5175";
const SHORT_TTL = process.env.E2E_SHORT_TTL === "1";
const TTL_SECONDS = Number(process.env.E2E_ACCESS_TOKEN_TTL_SECONDS || 10);

async function loginBoss(page: Page): Promise<void> {
  await page.goto(`${BOSS_UI}/login`);
  await page.getByPlaceholder("Kullanıcı adı").fill("admin");
  await page.getByPlaceholder("Şifre").fill(
    process.env.E2E_ADMIN_PASSWORD || "kurulum-yeni-sifre-456",
  );
  await page.getByRole("button", { name: /Giriş|Login/i }).click();
  await page.waitForURL(/\/fields/, { timeout: 20000 });
}

test.describe("Superadmin auth (AUTH-REFRESH — UC-5)", () => {
  test.describe.configure({ timeout: 120_000 });

  test("AK-5.2: logout → login ekranı", async ({ page }) => {
    await loginBoss(page);
    await page.getByTitle("Çıkış").click();
    await page.waitForURL(/\/login/, { timeout: 20000 });
    await expect(page.getByPlaceholder("Kullanıcı adı")).toBeVisible({
      timeout: 10000,
    });
    const tokens = await page.evaluate(() => ({
      at: localStorage.getItem("auth-token"),
      rt: localStorage.getItem("auth-refresh-token"),
    }));
    expect(tokens.at).toBeNull();
    expect(tokens.rt).toBeNull();
  });

  test("kısa TTL: access süresi dolar → otomatik refresh → saha listesi kesintisiz", async ({
    page,
  }) => {
    test.skip(!SHORT_TTL, "A1: kısa access TTL stack'i gerekli (E2E_SHORT_TTL=1)");
    await loginBoss(page);

    await page.waitForTimeout((TTL_SECONDS + 5) * 1000 * 2);
    await page.reload();
    await page.waitForURL(/\/fields/, { timeout: 20000 });
    expect(page.url()).toContain("/fields");
  });
});
