// Field tier: boss olay toplama ucu — log_events whitelist'li delta (SPEC UC-4/UC-5).
// Sunum: yetki + sorgu doğrulama; iş mantığı use-case'te.

import type { FastifyInstance } from "fastify";
import type { ListFieldEventsUseCase } from "../../application/events/list-field-events-use-case";
import { authorizeCommand } from "./internal-authorize";

export interface EventRoutesDeps {
  /** Field olay feed'i use-case'i (yoksa uç kapalı). */
  feed?: ListFieldEventsUseCase;
  /** Programatik kanal gizli token'ı (yoksa iç yol kapalı — fail-closed). */
  internalToken?: string;
}

/**
 * eventRoutes — `GET /api/events?after=<ISO>&limit=<n>`.
 *
 * Sözleşme (test: event-routes.test.ts):
 * - Yetki: admin/teknik (Bearer) veya iç token; yoksa 403 (fail-closed).
 * - `after` geçersizse 400; limit/whitelist/eşleme use-case'te.
 * - Yanıt: `{ events: FieldEventDto[] }`.
 */
export async function eventRoutes(
  fastify: FastifyInstance,
  deps: EventRoutesDeps,
): Promise<void> {
  fastify.get("/events", async (request, reply) => {
    if (!authorizeCommand(request, deps.internalToken)) {
      return reply.status(403).send({ error: "Bu islem icin yetkiniz yok" });
    }
    if (!deps.feed) {
      return reply.send({ events: [] });
    }

    const query = (request.query ?? {}) as {
      after?: string | string[];
      limit?: string | string[];
    };
    const afterRaw = Array.isArray(query.after) ? query.after[0] : query.after;
    const limitRaw = Array.isArray(query.limit) ? query.limit[0] : query.limit;

    if (afterRaw !== undefined && afterRaw.length > 0) {
      if (!Number.isFinite(new Date(afterRaw).getTime())) {
        return reply.status(400).send({ error: "invalid_after" });
      }
    }

    const events = await deps.feed.execute({
      ...(afterRaw !== undefined && afterRaw.length > 0 ? { after: afterRaw } : {}),
      ...(limitRaw !== undefined && limitRaw.length > 0
        ? { limit: Number(limitRaw) }
        : {}),
    });
    return reply.send({ events });
  });
}
