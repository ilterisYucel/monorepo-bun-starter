import type { FastifyInstance } from "fastify";
import type { DiscoverPeers } from "../../../application/discover-peers";

/** Keşif rotaları — hub'ın kendi REST API'si (Akış B). */
export function discoveryRoutes(
  fastify: FastifyInstance,
  deps: { discover: DiscoverPeers },
): void {
  fastify.get("/peers", async () => ({ peers: deps.discover.peers() }));

  fastify.get("/peers/:peerId/services", async (request, reply) => {
    const { peerId } = request.params as { peerId: string };
    const result = deps.discover.servicesOf(peerId);
    if (result.isErr()) {
      return reply.status(404).send({ error: result.error().message });
    }
    return reply.send({ services: result.unwrap() });
  });
}
