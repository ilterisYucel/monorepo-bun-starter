import { describe, it, expect, vi } from "vitest";
import Fastify from "fastify";
import { wireGuardRoutes } from "./wireguard-routes";
import type { WireGuardConnection } from "../../infrastructure/wireguard/wireguard-connection";

/**
 * wireguard-routes sözleşmesi (Faz 4):
 * - GET / → host listesi; POST / → 201; PUT /:id → 404 yoksa; DELETE
 * - POST /:id/connect|disconnect → state; GET /:id/status
 * - Yoksa NotFoundError → 404
 */

function makeWireGuard(overrides: Partial<WireGuardConnection> = {}): WireGuardConnection {
  return {
    hosts: vi.fn().mockResolvedValue([{ id: "w-1", name: "wg-ist-1", endpoint: "5.5.5.5:51820", publicKey: "pub", createdAt: "", updatedAt: "" }]),
    saveHost: vi.fn().mockResolvedValue({ id: "w-2", name: "wg-ank-1", endpoint: "6.6.6.6:51820", publicKey: "pub2", createdAt: "", updatedAt: "" }),
    updateHost: vi.fn().mockResolvedValue(undefined),
    removeHost: vi.fn().mockResolvedValue(undefined),
    connect: vi.fn().mockResolvedValue({ id: "w-1", state: "up" }),
    disconnect: vi.fn().mockResolvedValue({ id: "w-1", state: "down" }),
    status: vi.fn().mockResolvedValue({ id: "w-1", state: "up" }),
    ensureSchema: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as WireGuardConnection;
}

async function buildApp(wireGuard: WireGuardConnection) {
  const app = Fastify();
  await app.register(
    async (fastify) => {
      await wireGuardRoutes(fastify, { wireGuard });
    },
    { prefix: "/api/admin/wireguard" },
  );
  return app;
}

describe("wireguard-routes (Faz 4)", () => {
  it("GET / → 200 host listesi", async () => {
    const app = await buildApp(makeWireGuard());
    const res = await app.inject({ method: "GET", url: "/api/admin/wireguard/" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toHaveLength(1);
  });

  it("POST / → 201", async () => {
    const app = await buildApp(makeWireGuard());
    const res = await app.inject({
      method: "POST",
      url: "/api/admin/wireguard/",
      payload: { name: "wg-ank-1", endpoint: "6.6.6.6:51820", publicKey: "pub2", psk: "psk2" },
    });
    expect(res.statusCode).toBe(201);
  });

  it("PUT /:id → yoksa 404", async () => {
    const app = await buildApp(makeWireGuard());
    const res = await app.inject({
      method: "PUT",
      url: "/api/admin/wireguard/yok",
      payload: { name: "yeni" },
    });
    expect(res.statusCode).toBe(404);
  });

  it("POST /:id/connect → state up", async () => {
    const app = await buildApp(makeWireGuard());
    const res = await app.inject({
      method: "POST",
      url: "/api/admin/wireguard/w-1/connect",
      payload: { probeUrl: "http://field/api/health" },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().state).toBe("up");
  });

  it("connect NotFoundError → 404", async () => {
    const wireGuard = makeWireGuard({
      connect: vi.fn().mockRejectedValue({ kind: "not_found", message: "yok" }),
    });
    const app = await buildApp(wireGuard);
    const res = await app.inject({
      method: "POST",
      url: "/api/admin/wireguard/yok/connect",
    });
    expect(res.statusCode).toBe(404);
  });
});
