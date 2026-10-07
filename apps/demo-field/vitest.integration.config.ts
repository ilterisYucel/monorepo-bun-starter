import { defineConfig } from "vitest/config";

/**
 * Demo-field ENTEGRASYON test konfigürasyonu (SPEC UC-10 / T-43).
 *
 * Bu testler gerçek bir stack gerektirir (field + container). Stack yoksa
 * beforeAll sağlık kontrolü net hata verir — sessiz skip YOKTUR (FR-10.6).
 *
 * Çalıştırma:
 *   bun run dev:field-stack   # + container stack
 *   bun run test:demo-integration
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
    testTimeout: 90_000,
    hookTimeout: 60_000,
    fileParallelism: false,
  },
});
