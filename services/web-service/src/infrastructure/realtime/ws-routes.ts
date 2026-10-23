import type { FastifyInstance } from "fastify";
import type { RealtimeManager } from "./realtime-manager";
import type { ITokenService } from "../../domain/services/ITokenService";
import type { ISessionAuthenticator } from "../container-session/stateless-session-authenticator";

export async function telemetryWsRoutes(
  fastify: FastifyInstance,
  options: {
    realtime: RealtimeManager;
    tokens: ITokenService;
    /** Container tier: agent imzalı oturum token'larını da kabul eder. */
    sessionAuthenticator?: ISessionAuthenticator;
  },
): Promise<void> {
  const { realtime, tokens, sessionAuthenticator } = options;

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
          return;
        } catch {
          // Faz 3: access token değilse tünel oturum token'ı denenir
        }
        if (sessionAuthenticator) {
          const sessionUser =
            await sessionAuthenticator.authenticateToken(queryToken);
          if (sessionUser) return;
        }
        return reply
          .status(401)
          .send({ error: "Gecersiz veya suresi dolmus token" });
      },
    },
    (socket, _request) => {
      console.log("[WS] Yeni WebSocket baglantisi");

      socket.on("message", async (raw: Buffer) => {
        try {
          const msg = JSON.parse(raw.toString());

          if (msg.type === "subscribe" && msg.deviceId) {
            const names = Array.isArray(msg.names)
              ? (msg.names as unknown[]).filter((n): n is string => typeof n === "string")
              : undefined;
            if (names !== undefined && names.length > 0) {
              realtime.subscribe(msg.deviceId, socket, names);
            } else {
              realtime.subscribe(msg.deviceId, socket);
            }
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
