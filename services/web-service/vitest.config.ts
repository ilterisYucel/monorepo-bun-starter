import { defineConfig } from "vitest/config";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = resolve(__dirname, "../..");

export default defineConfig({
  resolve: {
    alias: {
      "@gd-monorepo/shared-types": resolve(workspaceRoot, "packages/shared-types/src"),
      "@gd-monorepo/result": resolve(workspaceRoot, "packages/result/src"),
      "@gd-monorepo/core": resolve(workspaceRoot, "packages/core/src"),
      "@gd-monorepo/platform-messaging": resolve(workspaceRoot, "packages/platform/messaging/src"),
      "@gd-monorepo/platform-logging": resolve(workspaceRoot, "packages/platform/logging/src"),
      "@gd-monorepo/tamper-logger": resolve(workspaceRoot, "packages/tamper-logger/src"),
      "@gd-monorepo/platform-container-access": resolve(workspaceRoot, "packages/platform/container-access/src"),
      "@gd-monorepo/ws-tunnel": resolve(workspaceRoot, "packages/ws-tunnel/src"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.{test,spec}.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      reportsDirectory: "./coverage",
      include: ["src/**/*.ts"],
    },
    reporters: ["default", "junit"],
    outputFile: {
      junit: "./test-results/junit.xml",
    },
  },
});
