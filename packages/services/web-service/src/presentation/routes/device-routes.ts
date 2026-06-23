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
        "SELECT id, name, protocol, status, manufacturer, model, poll_interval_ms, connection, last_seen, created_at FROM devices ORDER BY created_at",
      );
      return reply.send({ devices: rows });
    } catch (error) {
      console.error("[DeviceRoutes] devices hata:", error);
      return reply.status(500).send({ error: "Internal server error" });
    }
  });
}
