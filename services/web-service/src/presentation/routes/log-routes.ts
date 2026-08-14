import type { FastifyInstance } from "fastify";
import type { LogSource, LogType } from "@gd-monorepo/shared-types";
import { LogRepository } from "../../infrastructure/persistence/log-repository";

export async function logRoutes(
  fastify: FastifyInstance,
  options: { logRepo: LogRepository },
) {
  const { logRepo } = options;

  fastify.get("/", async (request, reply) => {
    try {
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
    } catch (error) {
      console.error("[LogRoutes] GET hata:", error);
      return reply.status(500).send({ error: "Internal server error" });
    }
  });

  fastify.post("/", async (request, reply) => {
    try {
      const body = request.body as {
        type: string;
        source: string;
        message: string;
        details?: string;
      };

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
    } catch (error) {
      console.error("[LogRoutes] POST hata:", error);
      return reply.status(500).send({ error: "Internal server error" });
    }
  });
}
