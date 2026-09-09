import { describe, it, expect } from "vitest";
import Fastify from "fastify";
import { makeStatusRoute } from "./status-route";
import type { TunnelConnector } from "@gd-monorepo/ws-tunnel";

/**
 * T2.2 — GET /api/status sözleşmesi (tasarım §6):
 * - `{ connected, state, lastHeartbeatAt }` döner — container UI "Field
 *   Bağlantısı" göstergesinin kaynağı.
 * - fieldConnector yoksa (FIELD_CONNECT_ENABLED=false / field-boss tier):
 *   `{ connected:false, state:"offline" }` — lastHeartbeatAt yok.
 * - lastHeartbeatAt ISO string'dir; hiç heartbeat yoksa alan yoktur.
 */

function makeConnector(overrides: {
  state?: TunnelConnector["state"] extends () => infer R ? R : never;
  connected?: boolean;
  lastHeartbeatAt?: number;
} = {}) {
  return {
    state: () => overrides.state ?? "connected",
    connected: () => overrides.connected ?? true,
    lastHeartbeatAt: () => overrides.lastHeartbeatAt,
  } as unknown as TunnelConnector;
}

describe("status-route (T2.2)", () => {
  it("bağlı connector → connected true + state + heartbeat", async () => {
    const app = Fastify();
    app.get(
      "/api/status",
      makeStatusRoute({ fieldConnector: makeConnector({ lastHeartbeatAt: 1756116000000 }) }),
    );
    const res = await app.inject({ method: "GET", url: "/api/status" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      connected: true,
      state: "connected",
      lastHeartbeatAt: new Date(1756116000000).toISOString(),
    });
  });

  it("heartbeat hiç atılmadıysa lastHeartbeatAt yoktur", async () => {
    const app = Fastify();
    app.get(
      "/api/status",
      makeStatusRoute({ fieldConnector: makeConnector({ connected: false, state: "backoff" }) }),
    );
    const res = await app.inject({ method: "GET", url: "/api/status" });
    const body = res.json();
    expect(body.connected).toBe(false);
    expect(body.state).toBe("backoff");
    expect(body.lastHeartbeatAt).toBeUndefined();
  });

  it("connector yoksa kapalı durum bildirir", async () => {
    const app = Fastify();
    app.get("/api/status", makeStatusRoute({}));
    const res = await app.inject({ method: "GET", url: "/api/status" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ connected: false, state: "offline" });
  });
});
