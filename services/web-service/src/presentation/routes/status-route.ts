import type { FastifyReply, FastifyRequest } from "fastify";
import type { FieldConnector } from "@gd-monorepo/ws-tunnel";
import type { FieldConnectionStatus } from "@gd-monorepo/ws-tunnel";

/**
 * GET /api/status — FieldConnector PPC durumu (tasarım §6, T2.2).
 * Container UI "Field Bağlantısı" göstergesini besler.
 * fieldConnector yoksa (kapalı / field-boss tier) kapalı durum bildirilir —
 * UI asla beyaz ekranda kalmaz.
 */
export function makeStatusRoute(deps: { fieldConnector?: FieldConnector }) {
  const { fieldConnector } = deps;

  return async function statusRoute(
    _request: FastifyRequest,
    reply: FastifyReply,
  ) {
    if (!fieldConnector) {
      const body: FieldConnectionStatus = {
        fieldConnected: false,
        state: "offline",
      };
      return reply.send(body);
    }
    const lastHeartbeatAt = fieldConnector.lastHeartbeatAt();
    const body: FieldConnectionStatus = {
      fieldConnected: fieldConnector.fieldConnected(),
      state: fieldConnector.state(),
      ...(lastHeartbeatAt !== undefined
        ? { lastHeartbeatAt: new Date(lastHeartbeatAt).toISOString() }
        : {}),
    };
    return reply.send(body);
  };
}
