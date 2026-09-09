import { defineConfig } from "vite";
import type { Plugin, ViteDevServer } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";
import type { Socket } from "node:net";

/**
 * Bun uyumluluk shim'i — dev-only (apps/field vite.config.ts'deki desen).
 *
 * Bun'un HTTP server bağlantı soketi Node'un `net.Socket` prototype'ından
 * GELMEZ; `destroySoon` taşımaz. Vite'in yerleşik WS proxy'si akış sonunda
 * `socket.destroySoon()` çağırır → TypeError ile dev sunucusu ÇÖKER
 * (Boss Faz 3: "/fields" tünel proxy'si — ws: true — tünel trafiği kapanınca
 * tetiklendi; canlı 2026-09-09).
 */
const bunSocketCompat: Plugin = {
  name: "bun-socket-compat",
  configureServer(server: ViteDevServer) {
    server.httpServer?.on("connection", (socket: Socket) => {
      if (typeof socket.destroySoon !== "function") {
        socket.destroySoon = () => socket.destroy();
      }
    });
  },
};

export default defineConfig({
  plugins: [react(), bunSocketCompat, VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "CCC Field Manager",
        short_name: "CCC",
        start_url: "/",
        display: "standalone",
        orientation: "portrait",
        theme_color: "#0a0a0a",
        background_color: "#0a0a0a",
        icons: [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@gd-monorepo/shared-types": path.resolve(
        __dirname,
        "../../packages/shared-types/src",
      ),
      "@gd-monorepo/ui": path.resolve(__dirname, "../../packages/ui/src"),
    },
  },
  server: {
    port: 5175,
    strictPort: true,
    host: true,
    proxy: {
      "/api": {
        target: process.env.VITE_SUPERADMIN_SERVICE_URL || "http://localhost:5003",
        changeOrigin: true,
      },
      // Boss Faz 3: field app tünel yolları web-service'e gider (WS upgrade
      // dahil) — Vite SPA fallback'i /fields/* altındaki tünel trafiğini
      // YUTARDI (iframe'de boss'un kendi index'i dönerdi). Field app'teki
      // "/containers" proxy deseninin birebir karşılığı.
      "/fields": {
        target: process.env.VITE_SUPERADMIN_SERVICE_URL || "http://localhost:5003",
        changeOrigin: true,
        ws: true,
      },
    },
  },
  optimizeDeps: {
    include: ["react", "react-dom", "react-router-dom", "@tanstack/react-query", "@playcanvas/react"],
    exclude: ["@gd-monorepo/ui"],
    force: true,
  },
  build: {
    outDir: "./dist",
    emptyOutDir: true,
  },
});