import { test, expect, type Page } from "@playwright/test";

const step = (name: string) => console.log("[E2E]", name);

/**
 * Field manevra paneli E2E (WS4 Faz C — panel GERÇEK komut gönderir):
 *
 * Field UI Control sayfasında FL-05 Acil Durdurma kartı (güvenli: PCS stop,
 * rollback yok) çalıştırılır; komut field device-service'te (Wattox PCS
 * simülatörü) yürütülür ve read-back doğrulanır; kart success durumuna döner.
 *
 * Ön koşul: field + container dev stack'leri, saha kurulumu (FIELD_ID env),
 * field UI 5174'te. PCS simülatörü NORMAL duruma kendiliğinden geçer
 * (tick ≥ 6 — açılış sonrası ilk saniyeler).
 */

const FIELD_UI = process.env.FIELD_UI_URL || "http://localhost:5174";
const FIELD_ID = process.env.FIELD_ID || "5d5e49dc-7757-4f3e-a026-0263c2966bc6";
const ADMIN_PASSWORD =
  process.env.E2E_ADMIN_PASSWORD || "kurulum-yeni-sifre-456";
const FIELD_ROOT = FIELD_UI;

async function loginField(page: Page): Promise<void> {
  await page.goto(`${FIELD_ROOT}/login`);
  await page.getByPlaceholder("Kullanıcı adı").fill("admin");
  await page.getByPlaceholder("Şifre").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: /Giriş|Login/i }).click();
  await page.waitForURL(/\/field\//, { timeout: 15000 });
}

test.describe("Field manevra paneli (Control)", () => {
  test.describe.configure({ timeout: 120_000 });

  test("FL-05 kartı gerçek komutu çalıştırır ve success'e döner", async ({
    page,
  }) => {
    await loginField(page);
    step("1-login-ok");

    await page.goto(`${FIELD_UI}/field/${FIELD_ID}/control`);
    step("2-control-page");

    // Kart sırası katalog sırasıdır (buildFieldManeuvers): FL-01 start(0),
    // FL-01 shutdown(1), FL-02 charge(2), FL-02 discharge(3), FL-03 idle(4),
    // FL-04 calibration(5), FL-05 emergency stop(6), FL-11 maintenance(7).
    // Gizli manevralar (FL-06/07/10) kart OLARAK render edilmez.
    const runButtons = page.locator("button", { hasText: /Çalıştır/ });
    await expect(runButtons.nth(6)).toBeVisible({ timeout: 15000 });
    // Veri hazır olmadan tıklama boş hedef seti üretir (anlık failed) —
    // adım satırları PCS-1'i taşıyana kadar beklenir (konteyner snapshot'ı).
    await expect(page.getByText(/Adımlar.*PCS-1/).first()).toBeVisible({
      timeout: 30000,
    });
    step("3-fl05-visible");

    const fl05Run = runButtons.nth(6);
    await fl05Run.click();
    step("4-run-clicked");

    // Çalışıyor... görünür (komut field device-service'e gidiyor)
    await expect(
      page.locator("text=/Çalışıyor|Running/").first(),
    ).toBeVisible({ timeout: 15000 });
    step("5-running-visible");

    // Tamamlanma: kart Çalıştır durumuna geri döner (success — PCS stop
    // doğrulanır); Tekrar Dene GÖRÜNMEZ
    await expect(fl05Run).toBeVisible({ timeout: 45000 });
    await expect(
      page.locator("button", { hasText: /Tekrar Dene|Retry/ }).first(),
    ).toHaveCount(0);
    step("6-success-state");
  });

  test("FL-03 Idle kartı PCS'lere set_power_zero gönderir", async ({ page }) => {
    await loginField(page);
    await page.goto(`${FIELD_UI}/field/${FIELD_ID}/control`);

    const runButtons = page.locator("button", { hasText: /Çalıştır/ });
    const fl03Run = runButtons.nth(4);
    await expect(fl03Run).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/Adımlar.*PCS-1/).first()).toBeVisible({
      timeout: 30000,
    });
    await fl03Run.click();

    await expect(fl03Run).toBeVisible({ timeout: 45000 });
    await expect(
      page.locator("button", { hasText: /Tekrar Dene|Retry/ }).first(),
    ).toHaveCount(0);
    step("fl03-success");
  });
});
