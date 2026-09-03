import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    // @pixi/react (packages/ui barrel'ı) uzantısız derin import kullanır —
    // externalized modüllerde node ESM çözümü reddeder (field ile aynı).
    server: {
      deps: {
        inline: ["@pixi/react"],
      },
    },
  },
});
