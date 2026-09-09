import type { FastifyInstance } from "fastify";
import type { WireGuardConnection } from "../../infrastructure/wireguard/wireguard-connection";

const statusForKind = (error: unknown): number => {
  const kind = (error as { kind?: string }).kind;
  if (kind === "not_found") return 404;
  return 500;
};

/**
 * WireGuard rotaları (BOSS Faz 4 — yedek yol, §7.5):
 * - CRUD: GET /, POST /, PUT /:id, DELETE /:id
 * - Bağlantı: POST /:id/connect (opsiyonel probeUrl), POST /:id/disconnect,
 *   GET /:id/status
 * PSK yanıtlara GİRMEZ (write-only); işlem hataları kademeli bozulur.
 */
export async function wireGuardRoutes(
  fastify: FastifyInstance,
  deps: { wireGuard: WireGuardConnection },
): Promise<void> {
  fastify.get("/", async (_request, reply) => {
    const hosts = await deps.wireGuard.hosts();
    return reply.send(hosts);
  });

  fastify.post("/", async (request, reply) => {
    const body = request.body as {
      name: string;
      endpoint: string;
      publicKey: string;
      psk: string;
    };
    try {
      const host = await deps.wireGuard.saveHost(body);
      return reply.status(201).send(host);
    } catch (error) {
      return reply
        .status(statusForKind(error))
        .send({ error: (error as Error).message });
    }
  });

  fastify.put("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as {
      name?: string;
      endpoint?: string;
      publicKey?: string;
      psk?: string;
    };
    const host = await deps.wireGuard.updateHost(id, body);
    if (!host) return reply.status(404).send({ error: "Host bulunamadi" });
    return reply.send(host);
  });

  fastify.delete("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    await deps.wireGuard.removeHost(id);
    return reply.send({ success: true });
  });

  fastify.post("/:id/connect", async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as { probeUrl?: string } | undefined;
    try {
      const state = await deps.wireGuard.connect(id, body?.probeUrl);
      return reply.send(state);
    } catch (error) {
      return reply
        .status(statusForKind(error))
        .send({ error: (error as Error).message });
    }
  });

  fastify.post("/:id/disconnect", async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const state = await deps.wireGuard.disconnect(id);
      return reply.send(state);
    } catch (error) {
      return reply
        .status(statusForKind(error))
        .send({ error: (error as Error).message });
    }
  });

  fastify.get("/:id/status", async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const state = await deps.wireGuard.status(id);
      return reply.send(state);
    } catch (error) {
      return reply
        .status(statusForKind(error))
        .send({ error: (error as Error).message });
    }
  });
}
