import { test, expect } from "@playwright/test";

test.describe("Auth Flow", () => {
  test("login page loads", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("input[name='username']")).toBeVisible();
    await expect(page.locator("input[name='password']")).toBeVisible();
    await expect(page.locator("button[type='submit']")).toBeVisible();
  });

  test("login with invalid credentials shows error", async ({ page }) => {
    await page.goto("/login");
    await page.fill("input[name='username']", "wrong");
    await page.fill("input[name='password']", "wrong");
    await page.click("button[type='submit']");
    await expect(page.locator("[role='alert'], .error, .toast-error")).toBeVisible({
      timeout: 5000,
    });
  });

  test("protected routes redirect to login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("Navigation", () => {
  test("sidebar navigation links exist", async ({ page }) => {
    await page.goto("/");
    const navLinks = page.locator("nav a, [role='navigation'] a");
    const count = await navLinks.count();
    expect(count).toBeGreaterThan(0);
  });
});
