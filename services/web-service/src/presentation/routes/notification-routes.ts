import type { FastifyInstance } from "fastify";
import type { NotificationsUseCase } from "../../application/notifications/notifications-use-case";

/**
 * Bildirim rotaları (Boss Faz 5, §7.6) — boss tier.
 * Sunum: sorgu doğrulama; limit/toplama iş mantığı use-case'te.
 * Okundu durumu client-side'dır; sunucu liste + sayaç sunar.
 */
export async function notificationRoutes(
  fastify: FastifyInstance,
  deps: { notifications?: NotificationsUseCase },
): Promise<void> {
  fastify.get("/", async (request, reply) => {
    if (!deps.notifications) return reply.send([]);
    const { limit, after } = request.query as {
      limit?: string;
      after?: string;
    };
    const events = await deps.notifications.list({
      ...(limit !== undefined ? { limit: Number(limit) } : {}),
      ...(after !== undefined && after.length > 0 ? { after } : {}),
    });
    return reply.send(events);
  });

  fastify.get("/unread-count", async (request, reply) => {
    const { since } = request.query as { since?: string };
    if (!since || since.length === 0) {
      return reply.status(400).send({ error: "since sorgu parametresi gerekli" });
    }
    if (!deps.notifications) {
      return reply.send({ count: 0 });
    }
    const count = await deps.notifications.countSince(since);
    return reply.send({ count });
  });
}
