import { defineConfig } from "vitest/config";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = resolve(__dirname, "../..");

export default defineConfig({
  resolve: {
    alias: {
      "@gd-monorepo/plugin-sdk": resolve(
        workspaceRoot,
        "packages/plugin-sdk/src",
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
