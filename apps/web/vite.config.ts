import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@gd-monorepo/shared-types": path.resolve(
        __dirname,
        "../../packages/shared-types/src",
      ),
      "@gd-monorepo/shared-utils": path.resolve(
        __dirname,
        "../../packages/shared-utils/src",
      ),
    },
  },
  server: {
    port: 5173,
    host: true, // 🔥 Container dışından erişim için
    watch: {
      usePolling: true, // 🔥 Docker'da hot-reload için
      interval: 100,
    },
    proxy: {
      "/api": {
        target: process.env.VITE_API_URL || "http://localhost:5000",
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "./dist",
    emptyOutDir: true,
  },
});
