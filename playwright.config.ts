import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  // testDir kök: kritik akışlar `tests/e2e/{site,container}`, legacy `e2e/`.
  testDir: ".",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["html"], ["junit", { outputFile: "test-results/e2e-junit.xml" }]],
  use: {
    baseURL: process.env.BASE_URL || "http://localhost:8088",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      testMatch: /\/e2e\/[^/]+\.(spec|test)\.ts$/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      testMatch: /\/e2e\/[^/]+\.(spec|test)\.ts$/,
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit",
      testMatch: /\/e2e\/[^/]+\.(spec|test)\.ts$/,
      use: { ...devices["Desktop Safari"] },
    },
    {
      // 2026-08-30 (T6.20 — nis-2.md Adım 14): güvenlik E2E'leri ayrı
      // projede — CI'da yalnızca chromium ile koşar (kanıt fabrikası).
      name: "security",
      testMatch: /\/e2e\/security\/.*\.spec\.ts$/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      // SPEC: BAGIMLILIK-YONU-VE-TEST-DUZENI / K13 — kritik site akışları.
      name: "site",
      testMatch: /\/tests\/e2e\/site\/.*\.e2e\.spec\.ts$/,
      // Canlı stack: tek operatör. Paralel dosyalar aynı BSC/PCS'i sıfırlamaya
      // çalışıp birbirini kilitliyor → sıralı koşum.
      fullyParallel: false,
      workers: 1,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      // Kritik konteyner akışı (konteyner UI).
      name: "container",
      testMatch: /\/tests\/e2e\/container\/.*\.e2e\.spec\.ts$/,
      fullyParallel: false,
      workers: 1,
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: process.env.CI
    ? undefined
    : [
        {
          command: "bun nx run web-service:dev",
          url: "http://localhost:5001/health",
          reuseExistingServer: !process.env.CI,
          timeout: 30_000,
        },
        {
          // Container UI (mock render) — E2E konteyner akışı için.
          command: "bun nx run container-web-v2:dev",
          url: "http://localhost:5174",
          reuseExistingServer: !process.env.CI,
          timeout: 60_000,
        },
      ],
});
