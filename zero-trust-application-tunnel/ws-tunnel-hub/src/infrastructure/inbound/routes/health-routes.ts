import type { FastifyInstance } from "fastify";
import type { HealthCheck } from "../../../application/health-check";

/** `/health` — servis sağlığı. */
export function healthRoutes(
  fastify: FastifyInstance,
  deps: { health: HealthCheck },
): void {
  fastify.get("/health", async (_request, reply) => {
    return reply.send(deps.health.execute());
  });
}
