import type { FastifyInstance } from "fastify";
import type { RealtimeManager } from "./realtime-manager";

export async function telemetryWsRoutes(
  fastify: FastifyInstance,
  options: {
    realtime: RealtimeManager;
  },
): Promise<void> {
  const { realtime } = options;

  fastify.get(
    "/ws/telemetry",
    { websocket: true },
    (socket, _request) => {
      console.log("[WS] Yeni WebSocket baglantisi");

      socket.on("message", async (raw: Buffer) => {
        try {
          const msg = JSON.parse(raw.toString());

          if (msg.type === "subscribe" && msg.deviceId) {
            realtime.subscribe(msg.deviceId, socket);
            await realtime.sendInitialData(msg.deviceId, socket);
            socket.send(
              JSON.stringify({
                type: "subscribed",
                deviceId: msg.deviceId,
              }),
            );
          } else if (msg.type === "unsubscribe" && msg.deviceId) {
            realtime.unsubscribe(msg.deviceId, socket);
            socket.send(
              JSON.stringify({
                type: "unsubscribed",
                deviceId: msg.deviceId,
              }),
            );
          }
        } catch (error) {
          socket.send(
            JSON.stringify({
              type: "error",
              message: "Invalid message format",
            }),
          );
        }
      });

      socket.on("close", () => {
        realtime.unsubscribeAll(socket);
        console.log("[WS] WebSocket baglantisi kapandi");
      });

      socket.on("error", (error: Error) => {
        console.error("[WS] WebSocket hatasi:", error);
      });
    },
  );
}
