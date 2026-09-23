import { test, expect, type Page } from "@playwright/test";

const step = (name: string) => console.log("[E2E]", name);

/**
 * Field manevra paneli E2E (Faz D2 — sunucu kataloğu):
 *
 * Field UI Control sayfasında kartlar GET /api/maneuvers + /api/operations'tan
 * gelir (UI TANIMLAMAZ). FL-05 Acil Durdurma kartı (güvenli: PCS stop) ve
 * FL-03 Idle kartı çalıştırılır; komut field device-service'te (Wattox PCS
 * simülatörü) yürütülür ve read-back doğrulanır; kart success'e döner.
 *
 * Kart hedefleme `data-card-name` ile yapılır (kart sırasına bağlı DEĞİL).
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
  // Otomatik-guest yarışı: login admin tamamlanmadan guest navigasyonu URL'i
  // doldurur — ADMIN menüsü görünene kadar beklenir (admin-only "Kontrol").
  await expect(page.getByTitle(/Kontrol|Control/).first()).toBeVisible({
    timeout: 15000,
  });
}

/** Kart konteyneri — data-card-name hedefli (sıra bağımsız). */
function card(page: Page, name: string) {
  return page.locator(`[data-card-name="${name}"]`);
}

test.describe("Field manevra paneli (Control — sunucu kataloğu)", () => {
  test.describe.configure({ timeout: 120_000 });

  test("FL-05 kartı gerçek komutu çalıştırır ve success'e döner", async ({
    page,
  }) => {
    await loginField(page);
    step("1-login-ok");

    await page.goto(`${FIELD_UI}/field/${FIELD_ID}/control`);
    step("2-control-page");

    const fl05 = card(page, "fl05_emergency_stop");
    await expect(fl05).toBeVisible({ timeout: 30000 });
    step("3-fl05-visible");

    const run = fl05.getByRole("button", { name: /Çalıştır/ });
    await run.click();
    step("4-run-clicked");

    await expect(fl05.getByText(/Çalışıyor|Running/)).toBeVisible({
      timeout: 15000,
    });
    step("5-running-visible");

    // Tamamlanma: kart Çalıştır durumuna geri döner; Tekrar Dene GÖRÜNMEZ
    await expect(run).toBeVisible({ timeout: 45000 });
    await expect(fl05.getByText(/Tekrar Dene|Retry/)).toHaveCount(0);
    step("6-success-state");
  });

  test("FL-03 Idle kartı PCS'lere set_power_zero gönderir", async ({ page }) => {
    await loginField(page);
    await page.goto(`${FIELD_UI}/field/${FIELD_ID}/control`);

    const fl03 = card(page, "fl03_idle");
    await expect(fl03).toBeVisible({ timeout: 30000 });

    const run = fl03.getByRole("button", { name: /Çalıştır/ });
    await run.click();

    await expect(run).toBeVisible({ timeout: 45000 });
    await expect(fl03.getByText(/Tekrar Dene|Retry/)).toHaveCount(0);
    step("fl03-success");
  });

  test("gizli manevralar (FL-06/07/10) kart OLARAK render edilmez", async ({
    page,
  }) => {
    await loginField(page);
    await page.goto(`${FIELD_UI}/field/${FIELD_ID}/control`);

    await expect(card(page, "fl05_emergency_stop")).toBeVisible({
      timeout: 30000,
    });
    expect(await card(page, "fl06_recovery").count()).toBe(0);
    expect(await card(page, "fl07_comm_loss").count()).toBe(0);
    expect(await card(page, "fl10_islanding").count()).toBe(0);
    step("hidden-absent");
  });
});
