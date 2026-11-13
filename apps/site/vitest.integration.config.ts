import { defineConfig } from "vitest/config";

/**
 * Site ENTEGRASYON test konfigürasyonu (SPEC UC-10 / T-43).
 *
 * Bu testler gerçek bir stack gerektirir (field + container). Stack yoksa
 * beforeAll sağlık kontrolü net hata verir — sessiz skip YOKTUR (FR-10.6).
 *
 * Çalıştırma:
 *   bun run dev:stack:up
 *   bun run test:integration
 *
 * Ortam:
 *   DEMO_STACK_URL   (default http://localhost:5002) — field web-service
 *   DEMO_USER        (default admin)
 *   DEMO_PASSWORD    (default password123)
 */
export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["integration/**/*.integration.test.ts"],
    testTimeout: 180_000,
    hookTimeout: 600_000,
    fileParallelism: false,
  },
});
