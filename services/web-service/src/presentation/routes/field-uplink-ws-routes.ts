import type { FastifyInstance } from "fastify";
import type { FieldRegistry } from "../../infrastructure/field-uplink/field-registry";

/**
 * /ws/field — boss tier field uplink kabulü (Faz 3).
 * Konteyner modelinin (`/ws/container`) birebir karşılığı:
 * - Pre-upgrade Bearer token → `field_uplinks.token_hash` (401 — fail-closed).
 * - İlk text frame `register {peerId=fieldId, peerType:"field"}` → FieldRegistry.
 */
export async function fieldUplinkWsRoutes(
  fastify: FastifyInstance,
  deps: { registry: FieldRegistry },
): Promise<void> {
  fastify.get(
    "/ws/field",
    {
      websocket: true,
      onRequest: async (request, reply) => {
        const auth = request.headers.authorization;
        if (!auth?.startsWith("Bearer ")) {
          return reply.status(401).send({ error: "Service token gerekli" });
        }
        const token = auth.slice(7);
        const known = await deps.registry.authenticateToken(token);
        if (!known) {
          return reply.status(401).send({ error: "Gecersiz service token" });
        }
        (request as unknown as { serviceToken?: string }).serviceToken = token;
      },
    },
    (ws, req) => {
      console.log("[FieldUplink] Field WebSocket baglantisi");
      const token = (req as unknown as { serviceToken?: string }).serviceToken;

      ws.on("message", (raw) => {
        try {
          const msg = JSON.parse(raw.toString()) as {
            type?: string;
            peerId?: string;
            peerType?: string;
          };
          // v2-only: register şeması peerId + peerType taşır.
          if (msg.type === "register" && msg.peerId && msg.peerType === "field") {
            void deps.registry.register(msg.peerId, ws, token).then(() => {
              deps.registry.attachSocketHandlers(msg.peerId, ws);
            });
          }
        } catch {
          // invalid frame — yok say
        }
      });
    },
  );
}
