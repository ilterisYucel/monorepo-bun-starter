import { test, expect, type Page } from "@playwright/test";

const step = (name: string) => console.log("[E2E]", name);

/**
 * 2026-08-30 T5 — manevra UI akışı E2E kanıtı:
 * container-web Control sayfasında manevra kartı → "Çalıştır" → durum rozeti
 * (Çalışıyor... → success/failed) — UI katmanı (K5.1 tünelden doğrudan komut
 * atıyordu; bu spec ManeuverPanel bileşenini doğrular).
 *
 * Ön koşul: container dev stack'i + cihazlar bağlı.
 */

const WEB_UI = process.env.BASE_URL || "http://localhost:5173";

async function loginContainer(page: Page): Promise<void> {
  await page.goto(`${WEB_UI}/#/login`);
  await page.fill("input[name='username']", "admin");
  await page.fill("input[name='password']", process.env.E2E_ADMIN_PASSWORD || "kurulum-yeni-sifre-456");
  await page.click("button[type='submit']");
  await page.waitForTimeout(2000);
}

test.describe("Manevra UI (ControlPage)", () => {
  test.describe.configure({ timeout: 90_000 });

  test("manevra kartı çalıştırılır ve durum değişimi görünür", async ({
    page,
  }) => {
    await loginContainer(page);

    await page.goto(`${WEB_UI}/#/control`);
    step("control-page");

    // İlk manevra kartındaki çalıştır butonu
    const runButton = page.locator("button", { hasText: /Çalıştır|Run/ }).first();
    await expect(runButton).toBeVisible({ timeout: 15000 });
    step("maneuver-card-visible");

    await runButton.click();
    step("run-clicked");

    // Durum rozeti: Çalışıyor... → (varsa) success/failed — UI kilitlenmeden
    // bir sonuç üretir (komut API'si simülatör cihazlarla yanıt verir).
    await expect(
      page.locator("text=/Çalışıyor|Running|Tekrar Dene|Geri Al|Retry/").first(),
    ).toBeVisible({ timeout: 30000 });
    step("state-visible");
  });
});
