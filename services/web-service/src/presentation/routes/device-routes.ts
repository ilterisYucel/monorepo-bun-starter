import type { FastifyInstance } from "fastify";
import type { ISqlDatabase } from "@gd-monorepo/core";

export async function deviceRoutes(
  fastify: FastifyInstance,
  options: { postgres: ISqlDatabase },
) {
  const { postgres } = options;

  fastify.get("/devices", async (_request, reply) => {
    try {
      const rows = await postgres.query<Record<string, unknown>>(
        "SELECT id, name, protocol, status, type, rack_count, manufacturer, model, poll_interval_ms, connection, last_seen, created_at FROM devices ORDER BY created_at",
      );
      return reply.send({ devices: rows });
    } catch {
      // Faz 5.1 B3: field tier'da devices tablosu yoktur (field stack'inde
      // device-service yok — cihazlar konteyner snapshot'ından gelir).
      // 500 yerine boş liste (kademeli bozulma).
      return reply.send({ devices: [] });
    }
  });
}
