import { test, expect } from "@playwright/test";
import { FIELD_UI, fieldId, loginUi, prepareSite } from "./_site";

/**
 * E2E-1 — Kritik yolculuk: **login → saha görünümü**.
 *
 * SPEC: BAGIMLILIK-YONU-VE-TEST-DUZENI / K13 — e2e yalnız kritik kullanıcı
 * yollarını kapsar; protokol/telemetri detayı alt katmanların işi.
 *
 * Ön koşul: demo stack ayakta (`bun run dev:stack:up`).
 */

test.describe.configure({ mode: "serial", timeout: 90_000 });

test("E2E-1: login → saha açılır, cihaz görünümünde BSC ve PCS görünür", async ({ page }) => {
  const id = fieldId();
  test.skip(!id, "FIELD_ID yok (demo stack ayakta mı?)");

  await prepareSite();
  await loginUi(page);

  await page.goto(`${FIELD_UI}/field/${id}`);
  await expect(page.getByRole("tab", { name: "Devices" })).toBeVisible({ timeout: 20_000 });
  await page.getByRole("tab", { name: "Devices" }).click();

  // Kritik görünürlük: iki tier'ın cihazları yüklendi (canlı veri bağlı).
  await expect(page.getByText("PCS", { exact: false }).first()).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText("Battery", { exact: false }).first()).toBeVisible({ timeout: 20_000 });
});
