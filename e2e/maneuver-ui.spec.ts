import { test, expect, type Page } from "@playwright/test";

const step = (name: string) => console.log("[E2E]", name);

/**
 * 2026-08-30 T5 — manevra UI akışı E2E kanıtı (Faz D2 güncellemesi):
 * container-web Control sayfasında kartlar GET /api/maneuvers'tan gelir
 * (UI TANIMLAMAZ). İlk görünür kart "Çalıştır" → durum rozeti
 * (Çalışıyor... → success/failed) — ManeuverPanel bileşeni doğrulanır.
 *
 * Ön koşul: container dev stack'i + cihazlar bağlı.
 */

const WEB_UI = process.env.BASE_URL || "http://localhost:5173";

async function loginContainer(page: Page): Promise<void> {
  await page.goto(`${WEB_UI}/#/login`);
  // LoginForm input'ları name taşımaz — placeholder ile hedeflenir
  // ("admin" alt dize olarak "admin123" ile çakışır — exact eşleşme şart).
  await page.getByPlaceholder("admin", { exact: true }).fill("admin");
  await page
    .getByPlaceholder("admin123", { exact: true })
    .fill(process.env.E2E_ADMIN_PASSWORD || "kurulum-yeni-sifre-456");
  await page.locator("button[type='submit']").click();
  await page.waitForTimeout(2000);
}

test.describe("Manevra UI (ControlPage — sunucu kataloğu)", () => {
  test.describe.configure({ timeout: 90_000 });

  test("katalog sunucudan yüklenir; ilk kart çalıştırılır ve durum değişimi görünür", async ({
    page,
  }) => {
    await loginContainer(page);

    await page.goto(`${WEB_UI}/#/control`);
    step("control-page");

    // Sunucu kataloğu yüklensin (React Query) — ilk görünür kart fl01_start.
    const fl01 = page.locator('[data-maneuver-name="fl01_start"]');
    await expect(fl01).toBeVisible({ timeout: 45000 });
    step("maneuver-card-visible");

    const runButton = fl01.getByRole("button", { name: /Çalıştır|Run/ });
    await runButton.click();
    step("run-clicked");

    // Durum rozeti: Çalışıyor... → (varsa) success/failed — UI kilitlenmeden
    // bir sonuç üretir (komut API'si simülatör cihazlarla yanıt verir).
    await expect(
      fl01.getByText(/Çalışıyor|Running|Tekrar Dene|Retry/).first(),
    ).toBeVisible({ timeout: 30000 });
    step("state-visible");

    // E-2 tamamlanma kanıtı: yürütme BİTER — kart tekrar Çalıştır (success)
    // veya Tekrar Dene (failed) durumuna döner; sonsuz "Çalışıyor..." YOKTUR.
    await expect(
      fl01.getByText(/Çalışıyor|Running/).first(),
    ).toBeHidden({ timeout: 45000 });
    step("state-completed");
  });

  test("gizli kayıtlar (bsc_prepare) kart OLARAK render edilmez", async ({
    page,
  }) => {
    await loginContainer(page);
    await page.goto(`${WEB_UI}/#/control`);

    await expect(page.locator('[data-maneuver-name="fl01_start"]')).toBeVisible({
      timeout: 45000,
    });
    expect(await page.locator('[data-maneuver-name="bsc_prepare"]').count()).toBe(0);
    step("hidden-absent");
  });
});
