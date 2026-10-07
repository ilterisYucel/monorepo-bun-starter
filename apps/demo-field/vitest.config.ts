import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    // Entegrasyon testleri stack gerektirir → default koşumdan HARİÇ
    // (ayrı `vitest.integration.config.ts` + `test:demo-integration`).
    exclude: ["**/node_modules/**", "**/dist/**", "integration/**"],
    // @pixi/react (packages/ui barrel'ı) uzantısız derin import kullanır
    // (react-reconciler/constants) — externalized modüllerde node ESM çözümü
    // exports map'siz bunu reddeder. Inline edilince Vite çözer.
    server: {
      deps: {
        inline: ["@pixi/react"],
      },
    },
  },
});
