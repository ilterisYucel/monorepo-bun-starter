import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * demo-field OPERATIONS UI edge-case e2e: power input sınırları, gizli manevralar,
 * operasyon çalıştırma akışı. Ön koşul: v2/dev demo stack.
 */

const FIELD_UI = process.env.FIELD_UI_URL || "http://localhost:8088";
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

test.describe.configure({ mode: "serial", timeout: 90_000 });

test.beforeEach(async ({ page }) => {
  await page.goto(`${FIELD_UI}/login`);
  await page.getByTestId("login-username").fill(ADMIN);
  await page.getByTestId("login-password").fill(PASSWORD);
  await page.getByTestId("login-submit").click();
  await expect(page.getByTestId("demo-logo")).toBeVisible();
  // UC-11: login sonrası portföy sayfasına inilir; konsola geç.
  await page.goto(`${FIELD_UI}/field/${fieldId()}`);
  await page.getByRole("tab", { name: "Operations" }).click();
});

test("power input sınırları (min 0 / max 3568) tanımlı", async ({ page }) => {
  test.skip(!fieldId(), "FIELD_ID yok");
  const power = page.getByTestId("ops-power");
  await expect(power).toBeVisible({ timeout: 20_000 });
  await expect(power).toHaveAttribute("min", "0");
  await expect(power).toHaveAttribute("max", "3568");
});

test("gizli manevralar katalogda render edilmez (bsc_prepare/bsc_stop)", async ({ page }) => {
  test.skip(!fieldId(), "FIELD_ID yok");
  await expect(page.getByTestId("ops-power")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId("ops-item-bsc_prepare")).toHaveCount(0);
  await expect(page.getByTestId("ops-item-bsc_stop")).toHaveCount(0);
});
