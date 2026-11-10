import type { FastifyInstance } from "fastify";
import type { PeerChannelHub } from "./peer-channel-hub";

/** `/ws/peer` — peer uplink kabulü (Authorization: Bearer). */
export function peerWsRoutes(
  fastify: FastifyInstance,
  deps: { hub: PeerChannelHub },
): void {
  fastify.get("/ws/peer", { websocket: true }, (socket, request) => {
    const authorization = request.headers.authorization;
    if (!authorization?.startsWith("Bearer ")) {
      socket.close(1008, "peer token gerekli");
      return;
    }
    deps.hub.accept(socket, authorization.slice(7));
  });
}
