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
 * ile dev sunucusu çöker. Tünel (`/containers`, ws: true) trafiği kapanınca
 * tetikleniyordu.
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
    port: 5174,
    strictPort: true,
    host: true,
    proxy: {
      "/api": {
        target: process.env.VITE_FIELD_SERVICE_URL || "http://localhost:5002",
        changeOrigin: true,
      },
      // Faz 3 T3.5: tünel yolları web-service'e (WS upgrade dahil)
      "/containers": {
        target: process.env.VITE_FIELD_SERVICE_URL || "http://localhost:5002",
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
