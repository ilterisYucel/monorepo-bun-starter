import type { FastifyInstance } from "fastify";
import { TUNNEL_PEER_TYPES } from "@gd-monorepo/ws-tunnel";
import type { TunnelPeerType } from "@gd-monorepo/ws-tunnel";
import type { FieldRegistry } from "../../infrastructure/field-uplink/field-registry";

/**
 * /ws/field — boss tier peer uplink kabulü (Faz 3).
 * Konteyner modelinin (`/ws/container`) birebir karşılığı:
 * - Pre-upgrade Bearer token → `field_uplinks.token_hash` (401 — fail-closed).
 * - İlk text frame `register {peerId, peerType, services?}` → FieldRegistry.
 *   Peer tipi artık sabit değil (`TUNNEL_PEER_TYPES`); servis duyurusu opak
 *   aktarılır (WS-TUNNEL-OPAK-SERVIS-ERISIMI §6.2).
 */
export async function fieldUplinkWsRoutes(
  fastify: FastifyInstance,
  deps: { registry: FieldRegistry },
): Promise<void> {
  const isKnownPeerType = (value: unknown): value is TunnelPeerType =>
    typeof value === "string" &&
    (TUNNEL_PEER_TYPES as readonly string[]).includes(value);

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
      console.log("[FieldUplink] Peer WebSocket baglantisi");
      const token = (req as unknown as { serviceToken?: string }).serviceToken;

      ws.on("message", (raw) => {
        try {
          const msg = JSON.parse(raw.toString()) as {
            type?: string;
            peerId?: string;
            peerType?: string;
            services?: unknown;
          };
          // v2 register şeması: peerId + peerType (herhangi geçerli tip) + opsiyonel services.
          if (
            msg.type === "register" &&
            typeof msg.peerId === "string" &&
            isKnownPeerType(msg.peerType)
          ) {
            const peerId = msg.peerId;
            void deps.registry
              .register(peerId, ws, token, {
                peerType: msg.peerType,
                services: msg.services,
              })
              .then(() => {
                deps.registry.attachSocketHandlers(peerId, ws);
              });
          }
        } catch {
          // invalid frame — yok say
        }
      });
    },
  );
}
