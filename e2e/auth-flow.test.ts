import { test, expect } from "@playwright/test";

const PASSWORD = process.env.E2E_ADMIN_PASSWORD || "kurulum-yeni-sifre-456";

async function loginContainer(page: import("@playwright/test").Page): Promise<void> {
  await page.goto("/#/login");
  // LoginForm input'ları name TAŞIMAZ — placeholder ile hedeflenir
  // ("admin" alt dize olarak "admin123" ile çakışır — exact eşleşme şart).
  await page.getByPlaceholder("admin", { exact: true }).fill("admin");
  await page.getByPlaceholder("admin123", { exact: true }).fill(PASSWORD);
  await page.locator("button[type='submit']").click();
  await page.waitForTimeout(2000);
}

test.describe("Auth Flow", () => {
  test("login page loads", async ({ page }) => {
    await page.goto("/#/login");
    await expect(page.getByPlaceholder("admin", { exact: true })).toBeVisible();
    await expect(page.getByPlaceholder("admin123", { exact: true })).toBeVisible();
    await expect(page.locator("button[type='submit']")).toBeVisible();
  });

  test("login with invalid credentials shows error", async ({ page }) => {
    await page.goto("/#/login");
    await page.getByPlaceholder("admin", { exact: true }).fill("wrong");
    await page.getByPlaceholder("admin123", { exact: true }).fill("wrong");
    await page.click("button[type='submit']");
    await expect(page.locator("text=/Gecersiz|Geçersiz|Invalid/i")).toBeVisible({
      timeout: 5000,
    });
  });

  test("sidebar navigation links exist", async ({ page }) => {
    await loginContainer(page);
    const navLinks = page.locator("nav a, [role='navigation'] a, nav button, [role='navigation'] button");
    await expect(navLinks.first()).toBeVisible({ timeout: 15000 });
    expect(await navLinks.count()).toBeGreaterThanOrEqual(1);
  });

  test("protected routes redirect to login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });
});
