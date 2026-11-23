import { test, expect } from "@playwright/test";

/**
 * E2E-3 — Kritik yolculuk: **konteyner operatörü EMS panelini açar**.
 *
 * SPEC: BAGIMLILIK-YONU-VE-TEST-DUZENI / K13 — konteyner tarafında tek kritik
 * akış: panelin yüklenmesi, tek-hat şemasının çizilmesi ve raf detayının
 * açılması. Telemetri/protokol detayı bu katmanın işi değil.
 *
 * Ön koşul: `bun nx run container-web-v2:dev` (playwright webServer ayağa
 * kaldırır). Container UI şu an mock veriyle render eder (canlı bağlama İleri İş).
 */

const CONTAINER_UI = process.env.CONTAINER_UI_URL || "http://localhost:5174";

test.describe.configure({ mode: "serial" });

test("E2E-3: konteyner EMS paneli açılır, tek-hat ve raf detayı çalışır", async ({ page }) => {
  await page.goto(`${CONTAINER_UI}/#/`);

  // Panel kabuğu: başlık + tek-hat şeması.
  await expect(page.getByText("GD-1 · MV Station #1")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("pcs-circle").first()).toBeVisible();
  await expect(page.getByTestId("dc-cb").first()).toBeVisible();

  // Raf detayı: tek-hat üzerindeki raf kutusu (accessibility adı = raf kimliği) drawera açar.
  await page.getByRole("button", { name: /^Rack#1\b/ }).first().click();
  await expect(page.locator("aside")).toBeVisible({ timeout: 10_000 });
});
