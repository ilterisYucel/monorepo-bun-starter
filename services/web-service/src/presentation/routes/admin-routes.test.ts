import { describe, it, expect, vi } from "vitest";
import Fastify from "fastify";
import { adminRoutes } from "./admin-routes";
import type { FieldPoller } from "../../infrastructure/field-poller";

/**
 * admin-routes sözleşmesi (Faz 0 T0.6):
 * - Zaten sınıra yayılan tasarım (try/catch yok) — karakterizasyon sabitler:
 *   GET / liste, GET /:id (404), POST (201), PUT (404 + hata rethrow),
 *   DELETE, GET /:id/summary (502 — saha API erişilemez).
 */

function makePoller(overrides: Partial<FieldPoller> = {}): FieldPoller {
  return {
    fields: vi.fn().mockResolvedValue([{ id: "f-1", name: "Saha 1" }]),
    field: vi.fn().mockResolvedValue({ id: "f-1", name: "Saha 1", api_url: "http://saha" }),
    registeredField: vi.fn().mockResolvedValue({ id: "f-2" }),
    updateField: vi.fn().mockResolvedValue({ id: "f-1", name: "yeni" }),
    deleteField: vi.fn().mockResolvedValue(undefined),
    start: vi.fn(),
    stop: vi.fn(),
    ...overrides,
  } as unknown as FieldPoller;
}

async function buildApp(poller: FieldPoller) {
  const app = Fastify();
  await app.register(
    async (fastify) => {
      await adminRoutes(fastify, { fieldPoller: poller });
    },
    { prefix: "/api/admin/fields" },
  );
  return app;
}

describe("admin-routes (T0.6 karakterizasyon)", () => {
  it("GET / → 200 liste", async () => {
    const app = await buildApp(makePoller());
    const res = await app.inject({ method: "GET", url: "/api/admin/fields/" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toHaveLength(1);
  });

  it("GET /:id — yoksa 404", async () => {
    const app = await buildApp(makePoller({ field: vi.fn().mockResolvedValue(undefined) }));
    const res = await app.inject({ method: "GET", url: "/api/admin/fields/yok" });
    expect(res.statusCode).toBe(404);
  });

  it("POST / → 201", async () => {
    const app = await buildApp(makePoller());
    const res = await app.inject({
      method: "POST",
      url: "/api/admin/fields/",
      payload: { name: "Saha 2" },
    });
    expect(res.statusCode).toBe(201);
  });

  it("PUT /:id — yoksa 404", async () => {
    const app = await buildApp(makePoller({ field: vi.fn().mockResolvedValue(undefined) }));
    const res = await app.inject({
      method: "PUT",
      url: "/api/admin/fields/yok",
      payload: { name: "x" },
    });
    expect(res.statusCode).toBe(404);
  });

  it("PUT /:id — updateField Field not found → 404", async () => {
    const app = await buildApp(
      makePoller({ updateField: vi.fn().mockRejectedValue(new Error("Field not found")) }),
    );
    const res = await app.inject({
      method: "PUT",
      url: "/api/admin/fields/f-1",
      payload: { name: "x" },
    });
    expect(res.statusCode).toBe(404);
  });

  it("PUT /:id — beklenmeyen hata sınıra yayılır (rethrow)", async () => {
    const app = await buildApp(
      makePoller({ updateField: vi.fn().mockRejectedValue(new Error("db down")) }),
    );
    const res = await app.inject({
      method: "PUT",
      url: "/api/admin/fields/f-1",
      payload: { name: "x" },
    });
    expect(res.statusCode).toBe(500);
  });

  it("DELETE /:id → 200 {success}", async () => {
    const app = await buildApp(makePoller());
    const res = await app.inject({ method: "DELETE", url: "/api/admin/fields/f-1" });
    expect(res.statusCode).toBe(200);
  });

  it("GET /:id/summary — saha API erişilemezse 502", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("unreachable")) as unknown as typeof fetch;
    const app = await buildApp(makePoller());
    const res = await app.inject({ method: "GET", url: "/api/admin/fields/f-1/summary" });
    expect(res.statusCode).toBe(502);
  });
});
