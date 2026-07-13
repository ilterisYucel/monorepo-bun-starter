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
      "@gd-monorepo/ui": path.resolve(__dirname, "../../packages/ui/src"),
      "@gd-monorepo/device-library": path.resolve(
        __dirname,
        "../../packages/device-library/src",
      ),
    },
  },
  server: {
    port: 5174,
    host: true,
    watch: {
      usePolling: true,
      interval: 100,
    },
    proxy: {
      "/api": {
        target: process.env.VITE_WEB_SERVICE_URL || "http://localhost:5001",
        changeOrigin: true,
      },
    },
  },
  optimizeDeps: {
    include: ["react", "react-dom", "react-router-dom", "@xyflow/react"],
    exclude: ["@gd-monorepo/ui", "@gd-monorepo/device-library"],
    force: true,
  },
  build: {
    outDir: "./dist",
    emptyOutDir: true,
  },
});
