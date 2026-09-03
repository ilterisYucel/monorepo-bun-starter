import { defineConfig } from "vitest/config";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";

const __dirname = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = resolve(__dirname, "../..");

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      {
        // Alt yol import'ları (@gd-monorepo/container-web/lib/query-client
        // gibi) Vite 5 exact alias'la eşleşmez — regex prefix gerekir.
        find: /^@gd-monorepo\/container-web\//,
        replacement: resolve(workspaceRoot, "apps/container-web/src/"),
      },
      { find: "@gd-monorepo/shared-types", replacement: resolve(workspaceRoot, "packages/shared-types/src") },
      { find: "@gd-monorepo/shared-utils", replacement: resolve(workspaceRoot, "packages/shared-utils/src") },
      { find: "@gd-monorepo/ui", replacement: resolve(workspaceRoot, "packages/ui/src") },
      { find: "@gd-monorepo/container-web", replacement: resolve(workspaceRoot, "apps/container-web/src") },
      { find: "@gd-monorepo/container-desktop", replacement: resolve(workspaceRoot, "apps/container-desktop/src") },
    ],
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    setupFiles: ["./vitest.setup.ts"],
    // Vitest'e özel alias katmanı — resolve.alias regex'i bazı sürümlerde
    // transform aşamasında uygulanmıyor; test.alias garantilidir.
    alias: [
      {
        find: /^@gd-monorepo\/container-web\//,
        replacement: resolve(workspaceRoot, "apps/container-web/src/"),
      },
      { find: "@gd-monorepo/shared-types", replacement: resolve(workspaceRoot, "packages/shared-types/src") },
      { find: "@gd-monorepo/shared-utils", replacement: resolve(workspaceRoot, "packages/shared-utils/src") },
      { find: "@gd-monorepo/ui", replacement: resolve(workspaceRoot, "packages/ui/src") },
      { find: "@gd-monorepo/container-web", replacement: resolve(workspaceRoot, "apps/container-web/src") },
      { find: "@gd-monorepo/container-desktop", replacement: resolve(workspaceRoot, "apps/container-desktop/src") },
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      reportsDirectory: "./coverage",
      include: ["src/**/*.{ts,tsx}"],
    },
    reporters: ["default", "junit"],
    outputFile: {
      junit: "./test-results/junit.xml",
    },
  },
});
