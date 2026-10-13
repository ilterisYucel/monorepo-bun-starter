import { test, expect, type APIRequestContext } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * demo-field FAULTS (UC-6/7) e2e — gerçek arıza üretimi → UI listesi → notlu çözme.
 * Ön koşul: v2/dev demo stack (start:demo-integration). PCS-1 fault enjeksiyonu
 * field DebugInjector (15591) ile yapılır; alarmlar field /api/unified/alarms'ta görünür.
 */

const FIELD_UI = process.env.FIELD_UI_URL || "http://localhost:8088";
const INJECT = process.env.DEMO_FIELD_INJECT_URL || "http://localhost:15591";
const ADMIN = process.env.E2E_ADMIN_USER || "admin";
const PASSWORD = process.env.E2E_ADMIN_PASSWORD || "password1234";

function fieldId(): string {
  if (process.env.FIELD_ID) return process.env.FIELD_ID;
  try {
    const env = readFileSync(resolve(process.cwd(), "deployment/v2/dev/field/.env"), "utf-8");
    return env.split("\n").find((l) => l.startsWith("FIELD_ID="))?.slice("FIELD_ID=".length).trim() ?? "";
  } catch {
    return "";
  }
}

async function inject(request: APIRequestContext, deviceId: string, scenario: string): Promise<void> {
  const res = await request.post(`${INJECT}/inject`, { data: { deviceId, scenario } });
  expect(res.ok(), `enjeksiyon: ${deviceId}/${scenario}`).toBeTruthy();
}

async function loginUi(page: import("@playwright/test").Page): Promise<void> {
  await page.goto(`${FIELD_UI}/login`);
  await page.getByTestId("login-username").fill(ADMIN);
  await page.getByTestId("login-password").fill(PASSWORD);
  await page.getByTestId("login-submit").click();
  await expect(page.getByTestId("demo-logo")).toBeVisible();
}

test.describe.configure({ mode: "serial", timeout: 90_000 });

test("arfıza üretilir, Faults sayfasında görünür ve notlu çözülür", async ({ page, request }) => {
  test.skip(!fieldId(), "FIELD_ID yok");
  await inject(request, "PCS-1", "fault");
  await loginUi(page);

  await page.getByRole("tab", { name: "Faults" }).click();
  await page.getByTestId("fault-filter-active").click();

  const row = page.getByTestId("fault-row-PCS-1-PCS Fault Status");
  await expect(row).toBeVisible({ timeout: 30_000 });

  await row.click();
  await page.getByTestId("fault-note").fill("e2e: fault cleared");
  await page.getByRole("button", { name: "Mark resolved" }).click();

  // Çözülünce aktif filtreden düşer.
  await expect(row).toBeHidden({ timeout: 30_000 });

  await inject(request, "PCS-1", "nominal");
});
