import type { FastifyReply, FastifyRequest } from "fastify";
import type { TunnelConnector } from "@gd-monorepo/ws-tunnel";
import type { TunnelConnectionStatus } from "@gd-monorepo/ws-tunnel";

/**
 * GET /api/status — TunnelConnector PPC durumu (tasarım §6, T2.2).
 * Container UI "Field Bağlantısı" göstergesini besler.
 * fieldConnector yoksa (kapalı / field-boss tier) kapalı durum bildirilir —
 * UI asla beyaz ekranda kalmaz.
 */
export function makeStatusRoute(deps: { fieldConnector?: TunnelConnector }) {
  const { fieldConnector } = deps;

  return async function statusRoute(
    _request: FastifyRequest,
    reply: FastifyReply,
  ) {
    if (!fieldConnector) {
      const body: TunnelConnectionStatus = {
        connected: false,
        state: "offline",
      };
      return reply.send(body);
    }
    const lastHeartbeatAt = fieldConnector.lastHeartbeatAt();
    const body: TunnelConnectionStatus = {
      connected: fieldConnector.connected(),
      state: fieldConnector.state(),
      ...(lastHeartbeatAt !== undefined
        ? { lastHeartbeatAt: new Date(lastHeartbeatAt).toISOString() }
        : {}),
    };
    return reply.send(body);
  };
}
