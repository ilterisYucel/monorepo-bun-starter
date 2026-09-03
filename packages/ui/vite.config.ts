import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { resolve } from "path";

export default defineConfig({
  plugins: [
    react({
      plugins: [["@swc/plugin-emotion", { sourceMap: true }]],
    }),
  ],

  optimizeDeps: {
    include: ["pixi.js", "@pixi/react"],
  },
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "@gd-monorepo/ui",
      fileName: "index",
      formats: ["es"],
    },
    rollupOptions: {
      external: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "@gd-monorepo/shared-types",
      ],
      output: {
        globals: {
          react: "React",
          "react-dom": "ReactDOM",
        },
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith(".css")) {
            return "styles.css";
          }
          return assetInfo.name || "";
        },
      },
    },
    sourcemap: true,
  },
});
