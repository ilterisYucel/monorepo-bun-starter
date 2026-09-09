import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // jsdom'da gerçek leaflet/reakt-leaflet yerine test stub'ları.
      // $: yalnızca tam eşleşme — alt yol importları (css) etkilenmez.
      "leaflet$": path.resolve(__dirname, "./src/test-stubs/leaflet.ts"),
      "leaflet/dist/leaflet.css": path.resolve(
        __dirname,
        "./src/test-stubs/leaflet.css",
      ),
      "react-leaflet": path.resolve(__dirname, "./src/test-stubs/react-leaflet.tsx"),
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
