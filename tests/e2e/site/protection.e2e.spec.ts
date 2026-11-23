import { test, expect, type APIRequestContext } from "@playwright/test";
import { FIELD_UI, INJECT, fieldId, loginUi, prepareSite } from "./_site";

/**
 * E2E-4 — Kritik yolculuk: **arıza üretilir → Faults listesinde görünür →
 * notlu çözülür**.
 *
 * SPEC: BAGIMLILIK-YONU-VE-TEST-DUZENI / K13. Enjeksiyon field Sim-Lab
 * uyumluluk ucuyla yapılır; alarmlar field `/api/unified/alarms` üzerinden UI'a düşer.
 *
 * Ön koşul: `prepareSite()` + stack ayakta (`bun run dev:stack:up`).
 */

async function inject(
  request: APIRequestContext,
  deviceId: string,
  scenario: string,
): Promise<void> {
  const res = await request.post(`${INJECT}/inject`, { data: { deviceId, scenario } });
  expect(res.ok(), `enjeksiyon: ${deviceId}/${scenario}`).toBeTruthy();
}

test.describe.configure({ mode: "serial", timeout: 240_000 });

test("arıza üretilir, Faults sayfasında görünür ve notlu çözülür", async ({ page, request }) => {
  test.skip(!fieldId(), "FIELD_ID yok");
  await prepareSite();
  await inject(request, "PCS-1", "fault");

  try {
    await loginUi(page);
    await page.goto(`${FIELD_UI}/field/${fieldId()}`);
    await expect(page.getByRole("tab", { name: "Faults" })).toBeVisible({ timeout: 20_000 });
    await page.getByRole("tab", { name: "Faults" }).click();
    await page.getByTestId("fault-filter-active").click();

    const row = page.getByTestId("fault-row-PCS-1-PCS Fault Status");
    await expect(row).toBeVisible({ timeout: 30_000 });

    await row.click();
    await page.getByTestId("fault-note").fill("e2e: fault cleared");
    await page.getByRole("button", { name: "Mark resolved" }).click();

    // Çözülünce aktif filtreden düşer.
    await expect(row).toBeHidden({ timeout: 30_000 });
  } finally {
    // Enjeksiyon her durumda kaldırılır (sonraki akış kilitlenmesin).
    await inject(request, "PCS-1", "nominal");
  }
});
