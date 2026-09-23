import { test, expect, type Page } from "@playwright/test";

const step = (name: string) => console.log("[E2E]", name);

/**
 * Field operasyon paneli E2E (KOMUT Faz C/D — çapraz sistem):
 *
 * - FL-11 "Saha Bakım Modu" OPERASYON kartı: uzak adım (container-1 →
 *   fl10_maintenance_shutdown, tünel) + yerel adım (pcs_stop) — tek
 *   konteynerli dev sahasında UÇTAN UCA başarı yoludur (success).
 * - FL-02 "Saha Şarj" operasyon kartı: adımlar container-1 + container-2
 *   hazırlığı ister — dev sahasında container-2 YOKTUR → uzak adım
 *   system_unreachable → rollback → kart terminal duruma döner (asılı
 *   "Çalışıyor..." KALMAZ — kademeli bozulma kanıtı).
 *
 * Ön koşul: field + container dev stack'leri (container-1 bağlı),
 * field UI 5174.
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

function card(page: Page, name: string) {
  return page.locator(`[data-card-name="${name}"]`);
}

test.describe("Field operasyon paneli (çapraz sistem)", () => {
  test.describe.configure({ timeout: 180_000 });

  test("FL-11 Saha Bakım Modu: uzak + yerel adım → success", async ({
    page,
  }) => {
    await loginField(page);
    step("1-login-ok");

    await page.goto(`${FIELD_UI}/field/${FIELD_ID}/control`);
    const maintenance = card(page, "field_maintenance");
    await expect(maintenance).toBeVisible({ timeout: 30000 });
    step("2-card-visible");

    const run = maintenance.getByRole("button", { name: /Çalıştır/ });
    await run.click();
    step("3-run-clicked");

    // Terminal durum: kart Çalıştır'a döner; Tekrar Dene GÖRÜNMEZ
    // ("Çalışıyor..." geçicidir — hızlı yürütmelerde kaçabilir; terminal
    // durum asılı-kalmama kanıtıdır).
    await expect(run).toBeVisible({ timeout: 90000 });
    await expect(maintenance.getByText(/Tekrar Dene|Retry/)).toHaveCount(0);
    step("5-success");
  });

  test("FL-02 Saha Şarj: eksik sistem → kademeli bozulma (asılı kalmaz)", async ({
    page,
  }) => {
    await loginField(page);
    await page.goto(`${FIELD_UI}/field/${FIELD_ID}/control`);

    const charge = card(page, "field_charge");
    await expect(charge).toBeVisible({ timeout: 30000 });

    const run = charge.getByRole("button", { name: /Çalıştır/ });
    await run.click();

    // Terminal durum — sonsuz "Çalışıyor..." YOKTUR (rollback best-effort:
    // container-2 unreachable → rolled_back; kart success sayar)
    await expect(charge.getByText(/Çalışıyor|Running/)).toBeHidden({
      timeout: 90000,
    });
    await expect(run).toBeVisible({ timeout: 90000 });
    step("fl02-terminal");
  });
});
