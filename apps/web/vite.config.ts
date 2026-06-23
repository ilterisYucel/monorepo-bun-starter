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
      // 🔥 UI alias'ini src'ye yönlendir (hot-reload için)
      "@gd-monorepo/ui": path.resolve(__dirname, "../../packages/ui/src"),
    },
  },
  server: {
    port: 5173,
    host: true,
    watch: {
      usePolling: true,
      interval: 100,
    },
    proxy: {
      "/api/auth": {
        target: process.env.VITE_WEB_SERVICE_URL || "http://localhost:5001",
        changeOrigin: true,
      },
      "/api/data": {
        target: process.env.VITE_WEB_SERVICE_URL || "http://localhost:5001",
        changeOrigin: true,
      },
      "/api": {
        target: process.env.VITE_WEB_SERVICE_URL || "http://localhost:5001",
        changeOrigin: true,
      },
    },
  },
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-router-dom",
      "@tanstack/react-query",
    ],
    exclude: ["@gd-monorepo/ui"],
    force: true,
  },
  build: {
    outDir: "./dist",
    emptyOutDir: true,
  },
});
