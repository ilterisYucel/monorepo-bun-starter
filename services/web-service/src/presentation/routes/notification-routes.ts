import type { FastifyInstance } from "fastify";
import type { FieldEventCollector } from "../../infrastructure/field-uplink/field-event-collector";

/**
 * Bildirim rotaları (Boss Faz 5, §7.6) — boss tier.
 * Okundu durumu client-side'dır ("son görülme"); sunucu yalnızca
 * liste + o zamandan sonraki sayacı sunar.
 */
export async function notificationRoutes(
  fastify: FastifyInstance,
  deps: { collector: FieldEventCollector },
): Promise<void> {
  fastify.get("/", async (request, reply) => {
    const { limit, after } = request.query as {
      limit?: string;
      after?: string;
    };
    const parsedLimit = limit ? Number(limit) : 100;
    const safeLimit =
      Number.isFinite(parsedLimit) && parsedLimit > 0
        ? Math.min(Math.floor(parsedLimit), 500)
        : 100;
    const events = await deps.collector.list({
      limit: safeLimit,
      after: after && after.length > 0 ? after : undefined,
    });
    return reply.send(events);
  });

  fastify.get("/unread-count", async (request, reply) => {
    const { since } = request.query as { since?: string };
    if (!since || since.length === 0) {
      return reply.status(400).send({ error: "since sorgu parametresi gerekli" });
    }
    const count = await deps.collector.countSince(since);
    return reply.send({ count });
  });
}
