import { defineConfig } from "vitest/config";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";

const __dirname = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = resolve(__dirname, "../..");

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@gd-monorepo/shared-types": resolve(workspaceRoot, "packages/shared-types/src"),
      "@gd-monorepo/shared-utils": resolve(workspaceRoot, "packages/shared-utils/src"),
      "@gd-monorepo/ui": resolve(workspaceRoot, "packages/ui/src"),
      "@gd-monorepo/editor": resolve(workspaceRoot, "apps/editor/src"),
    },
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
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
