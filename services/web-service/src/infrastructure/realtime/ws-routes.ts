import type { FastifyInstance } from "fastify";
import type { RealtimeManager } from "./realtime-manager";
import type { ITokenService } from "../../domain/services/ITokenService";

export async function telemetryWsRoutes(
  fastify: FastifyInstance,
  options: {
    realtime: RealtimeManager;
    tokens: ITokenService;
  },
): Promise<void> {
  const { realtime, tokens } = options;

  fastify.get(
    "/ws/telemetry",
    {
      websocket: true,
      onRequest: async (request, reply) => {
        const queryToken = (request.query as Record<string, string>).token;
        if (!queryToken) {
          return reply.status(401).send({ error: "Yetkilendirme gerekli" });
        }
        try {
          await tokens.verifyAccess(queryToken);
        } catch {
          return reply.status(401).send({ error: "Gecersiz veya suresi dolmus token" });
        }
      },
    },
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
