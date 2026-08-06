import type { FastifyInstance } from "fastify";
import type { IContainerProxy } from "@gd-monorepo/core";

export async function containerWsRoutes(
  fastify: FastifyInstance,
  deps: { containerProxy: IContainerProxy },
): Promise<void> {
  fastify.get("/ws/container", { websocket: true }, (ws, req) => {
    console.log("[ContainerWs] Konteyner WebSocket baglantisi");

    ws.on("message", (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type === "register" && msg.containerId) {
          deps.containerProxy.registerContainer(msg.containerId, ws);
          if (msg.containerUrl) {
            deps.containerProxy.setContainerUrl(msg.containerId, msg.containerUrl);
          }
        }
      } catch {
        // invalid
      }
    });

    ws.on("close", () => {
      console.log("[ContainerWs] Konteyner baglantisi kapandi");
    });
  });
}
