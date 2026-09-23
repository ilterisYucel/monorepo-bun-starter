import { test, expect, type Page } from "@playwright/test";

const step = (name: string) => console.log("[E2E]", name);

/**
 * C4 — Admin operasyon tanım yönetimi E2E (KOMUT §11.3):
 *
 * - Admin sayfasında tanımlı operasyonlar + geçmiş listelenir.
 * - Kurucu: ad + adım (sistem + manevra seçimi) → Kaydet → tanım listede
 *   GÖRÜNÜR (POST /operations — persist anında zod).
 * - Devre Dışı Bırak → yumuşak silme (enabled=false) → listeden KALKAR.
 *
 * Ön koşul: field + container dev stack'leri, field UI 5174, admin girişi.
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

test.describe("Admin operasyon tanımları (C4)", () => {
  test.describe.configure({ timeout: 120_000 });

  test("tanımlar + geçmiş listelenir", async ({ page }) => {
    await loginField(page);
    await page.goto(`${FIELD_UI}/field/${FIELD_ID}/admin/operations`);
    step("1-page");

    // Dosyadan gelen tanım (field_charge) hibrit listede görünür
    await expect(page.getByText("Saha Şarj").first()).toBeVisible({
      timeout: 30000,
    });
    // Geçmiş tablosu başlığı
    await expect(page.getByText("Çalıştırma Geçmişi")).toBeVisible();
    step("2-lists-visible");
  });

  test("kurucu: adım seçimi + Kaydet → tanım listede görünür; yumuşak silme kaldırır", async ({
    page,
  }) => {
    await loginField(page);
    await page.goto(`${FIELD_UI}/field/${FIELD_ID}/admin/operations`);
    await expect(page.getByText("Saha Şarj").first()).toBeVisible({
      timeout: 30000,
    });

    // Ad + adım (yerel sistem + PCS Şarj manevrası)
    const opName = `e2e_op_${Date.now()}`;
    await page.getByLabel(/Ad:/).fill(opName);
    await page.getByLabel("step-0-maneuver").selectOption("pcs_charge");
    await page.getByRole("button", { name: "Kaydet" }).click();
    step("1-create-clicked");

    // Tanım listede GÖRÜNÜR (POST /operations — 201)
    await expect(page.getByText(opName).first()).toBeVisible({
      timeout: 15000,
    });
    step("2-created-visible");

    // Yumuşak silme: listeden KALKAR (enabled=false — DB kaydı gölgeler)
    await page.locator(`[data-delete-op="${opName}"]`).click();
    await expect(page.getByText(opName).first()).toBeHidden({
      timeout: 15000,
    });
    step("3-soft-deleted");
  });
});
