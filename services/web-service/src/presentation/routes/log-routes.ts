import type { FastifyInstance } from "fastify";
import type { LogSource, LogType } from "@gd-monorepo/shared-types";

import { LogRepository } from "../../infrastructure/persistence/log-repository";
import { LogRateLimiter } from "../middleware/log-rate-limiter";

export interface ClientLogEventInput {
  type: string;
  source: string;
  message: string;
  details?: string;
}

export async function logRoutes(
  fastify: FastifyInstance,
  options: { logRepo: LogRepository; rateLimiter?: LogRateLimiter },
) {
  const { logRepo, rateLimiter } = options;

  fastify.get("/", async (request, reply) => {
    const { source, type, from, to, limit, offset } = request.query as {
      source?: string;
      type?: string;
      from?: string;
      to?: string;
      limit?: string;
      offset?: string;
    };

    const logs = await logRepo.query({
      sources: source ? source.split(",").map((s: string) => s.trim()) as LogSource[] : undefined,
      types: type ? type.split(",").map((s: string) => s.trim()) as LogType[] : undefined,
      from,
      to,
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
    });

    return reply.send({ logs });
  });

  fastify.post("/", async (request, reply) => {
    if (rateLimiter && !rateLimiter.allow(request.ip)) {
      return reply.status(429).send({ error: "Cok fazla log istegi" });
    }

    const body = request.body as
      | {
          type: string;
          source: string;
          message: string;
          details?: string;
        }
      | { events?: ClientLogEventInput[] };

    // T0.8 batch formatı: { events: [...] }
    if ("events" in body) {
      const events = body.events ?? [];
      if (events.length === 0) {
        return reply.status(400).send({ error: "events bos olamaz" });
      }
      for (const event of events) {
        if (!event?.type || !event?.source || !event?.message) {
          return reply
            .status(400)
            .send({ error: "type, source ve message gerekli" });
        }
      }
      await Promise.all(
        events.map((event) =>
          logRepo.insert({
            type: event.type as any,
            source: event.source as any,
            message: event.message,
            details: event.details,
          }),
        ),
      );
      return reply.status(201).send({ accepted: events.length });
    }

    // Geriye uyumlu tek event formatı (T0.8 öncesi)
    if (!body?.type || !body?.source || !body?.message) {
      return reply
        .status(400)
        .send({ error: "type, source ve message gerekli" });
    }

    const log = await logRepo.insert({
      type: body.type as any,
      source: body.source as any,
      message: body.message,
      details: body.details,
    });

    return reply.status(201).send(log);
  });
}
