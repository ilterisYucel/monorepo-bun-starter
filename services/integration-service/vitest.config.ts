import { defineConfig } from "vitest/config";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = resolve(__dirname, "../..");

export default defineConfig({
  resolve: {
    alias: {
      "@gd-monorepo/shared-types": resolve(workspaceRoot, "packages/shared-types/src"),
      "@gd-monorepo/shared-utils": resolve(workspaceRoot, "packages/shared-utils/src"),
      "@gd-monorepo/core": resolve(workspaceRoot, "packages/core/src"),
      "@gd-monorepo/platform-messaging": resolve(workspaceRoot, "packages/platform/messaging/src"),
      "@gd-monorepo/plugin-sdk": resolve(workspaceRoot, "packages/plugin-sdk/src"),
      "@gd-monorepo/epias-market-prices": resolve(
        workspaceRoot,
        "packages/plugins/epias-market-prices/src",
      ),
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
  },
});
