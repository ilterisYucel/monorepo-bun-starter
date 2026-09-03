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
      "@gd-monorepo/container-web": resolve(workspaceRoot, "apps/container-web/src"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    setupFiles: ["./vitest.setup.ts"],
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
    // @pixi/react (packages/ui barrel'ı) uzantısız derin import kullanır
    // (react-reconciler/constants) — externalized modüllerde node ESM çözümü
    // exports map'siz bunu reddeder. Inline edilince Vite çözer (field ile aynı).
    server: {
      deps: {
        inline: ["@pixi/react"],
      },
    },
  },
});
