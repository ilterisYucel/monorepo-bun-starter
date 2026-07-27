import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["html"], ["junit", { outputFile: "test-results/e2e-junit.xml" }]],
  use: {
    baseURL: process.env.BASE_URL || "http://localhost:5173",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },
  ],
  webServer: process.env.CI
    ? undefined
    : [
        {
          command: "bun nx run container-web:dev",
          url: "http://localhost:5173",
          reuseExistingServer: !process.env.CI,
          timeout: 30_000,
        },
        {
          command: "bun nx run web-service:dev",
          url: "http://localhost:5001/health",
          reuseExistingServer: !process.env.CI,
          timeout: 30_000,
        },
      ],
});
