import { defineConfig } from "vite";
import type { Plugin, ViteDevServer } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import type { Socket } from "node:net";

/**
 * Bun uyumluluk shim'i — dev-only.
 *
 * Bun'un HTTP server bağlantı socket'i Node'un `net.Socket` prototype'ından
 * GELMEZ; `destroySoon` taşımaz. Vite'in yerleşik WS proxy'si akış sonunda
 * `socket.destroySoon()` çağırır (vite/dist/node/chunks/node.js) → TypeError
 * ile dev sunucusu çöker. Field app'te tünel kapanışında görüldü; burada
 * `/ws` proxy'si (ws: true) aynı kod yolundan geçer — latent aynı risk.
 *
 * Shim: gelen her bağlantıya instance-level `destroySoon → destroy` delegasyonu
 * kurulur. Prototip patch'i İŞE YARAMAZ — metot prototype'ta zaten var, eksik
 * olan gerçek instance sınıfında.
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
  plugins: [react(), bunSocketCompat],
  // Faz 4 T4.1: göreli asset yolları — SPA her subpath'te çalışır
  // (/containers/:cid/ui/ tünel modu dahil). Mutlak "/assets/..." yolları
  // tünelde field köküne düşer ve 404 verirdi.
  base: "./",
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
      "@gd-monorepo/ws-tunnel": path.resolve(
        __dirname,
        "../../packages/ws-tunnel/src",
      ),
    },
  },
  server: {
    port: 5173,
    host: true,
    // Faz 3: tünel loopback istekleri Host: "web" (servis adı) ile gelir —
    // Vite host kontrolü bunu 403'ler; dev ortaminda kabul edilir.
    allowedHosts: true,
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
      // Faz 5.1 B5: realtime WS (/ws/telemetry) doğrudan dev modunda da çalışır.
      // Önceki davranışta 5173 üzerinden WS bağlantısı 404'e düşüyordu — konteyner
      // app "veri yok" görüntülüyordu (tünel modu etkilenmiyordu).
      "/ws": {
        target: process.env.VITE_WEB_SERVICE_URL || "http://localhost:5001",
        changeOrigin: true,
        ws: true,
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
