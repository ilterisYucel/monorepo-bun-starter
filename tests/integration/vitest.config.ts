import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * ENTEGRASYON test konfigürasyonu — SPEC: `BAGIMLILIK-YONU-VE-TEST-DUZENI-MIMARISI.md`
 * (UC-3/K8: `tests/integration/<service>/`).
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
  // Kök bu dizindir; aksi halde CLI cwd (repo kökü) taranır ve .stryker-tmp
  // sandbox kopyaları da toplanır.
  root: fileURLToPath(new URL(".", import.meta.url)),
  test: {
    environment: "node",
    globals: true,
    include: ["**/*.integration.test.ts"],
    exclude: ["**/node_modules/**", "**/.stryker-tmp/**", "**/dist/**"],
    testTimeout: 150_000,
    hookTimeout: 600_000,
    fileParallelism: false,
  },
});
