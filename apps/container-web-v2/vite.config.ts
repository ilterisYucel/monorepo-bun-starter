import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  base: "./",
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
      "@gd-monorepo/ui-v2": resolve(__dirname, "../../packages/ui-v2/src"),
    },
  },
  server: {
    port: 5174,
    host: true,
    allowedHosts: true,
    watch: { usePolling: true, interval: 100 },
  },
  optimizeDeps: {
    include: ["react", "react-dom", "react-router-dom"],
    exclude: ["@gd-monorepo/ui-v2"],
  },
  build: {
    outDir: "./dist",
    emptyOutDir: true,
  },
});
