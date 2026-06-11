import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  css: {
    modules: {
      localsConvention: "camelCase",
      generateScopedName: "[name]__[local]___[hash:base64:5]",
    },
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
        "recharts",
        "@gd-monorepo/shared-types",
      ],
      output: {
        globals: {
          react: "React",
          "react-dom": "ReactDOM",
          recharts: "recharts",
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
