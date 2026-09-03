import type { FastifyReply, FastifyRequest } from "fastify";
import { TamperLogger } from "@gd-monorepo/tamper-logger";


/**
 * /health — servis sağlığı + log pipeline sağlığı yansıması (T0.10).
 * Logger degraded ise servis de degraded bildirir (drop sayaçlarıyla birlikte).
 */
export function makeHealthRoute(deps: { logger: TamperLogger }) {
  const { logger } = deps;

  return async function healthRoute(
    _request: FastifyRequest,
    reply: FastifyReply,
  ) {
    const health = logger.health();
    return reply.send({
      status: health.status === "degraded" ? "degraded" : "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      log: {
        status: health.status,
        pendingBatch: health.pendingBatch,
        dropped: health.dropped,
        lastFlushAt: health.lastFlushAt,
      },
    });
  };
}
