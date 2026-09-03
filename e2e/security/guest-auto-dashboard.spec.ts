import { test, expect, type Page } from "@playwright/test";

/**
 * 2026-08-30 T5 — otomatik guest E2E kanıtı (Faz R):
 * - Field uygulamasına HİÇBİR token olmadan gidildiğinde login ekranı
 *   GÖRÜNMEZ; GuestBootstrap varsayılan guest hesabıyla oturum açar ve
 *   Panel (dashboard) render edilir.
 * - Guest rolünde menüde YALNIZCA "Panel" görünür (diğer menüler gizli).
 *
 * Ön koşul: field dev stack'i + guest seed kullanıcısı (SEED_GUEST_PASSWORD).
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

test.describe("Otomatik guest (Faz R)", () => {
  test.describe.configure({ timeout: 60_000 });

  test("token'sız açılışta login YERİNE Panel render edilir", async ({
    page,
  }) => {
    await clearTokens(page);
    await page.goto(`${FIELD_UI}/field/${FIELD_ID}`);
    // Otomatik guest oturumu kurulur — login ekranına düşülmez.
    await page.waitForURL(new RegExp(`/field/${FIELD_ID}$`), { timeout: 15000 });
    await expect(page.getByText("Panel").first()).toBeVisible({ timeout: 10000 });
  });

  test("guest rolünde yalnızca Panel menüsü görünür", async ({ page }) => {
    await clearTokens(page);
    await page.goto(`${FIELD_UI}/field/${FIELD_ID}`);
    await page.waitForURL(new RegExp(`/field/${FIELD_ID}$`), { timeout: 15000 });

    await expect(page.getByTitle("Panel")).toBeVisible();
    // Yalnız salt-okunur menü: Kontrol/Konteynerler gizli
    await expect(page.getByTitle("Kontrol")).toHaveCount(0);
    await expect(page.getByTitle("Konteynerler")).toHaveCount(0);
  });
});
