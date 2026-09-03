import { test, expect } from "@playwright/test";

// ponytail: single smoke test to verify setup — expand with critical paths later
test("web app loads", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/GD/);
});
