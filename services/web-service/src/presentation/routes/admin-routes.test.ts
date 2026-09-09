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

async function buildApp(poller: FieldPoller, registry?: unknown) {
  const app = Fastify();
  await app.register(
    async (fastify) => {
      await adminRoutes(fastify, {
        fieldPoller: poller,
        registry: registry as never,
      });
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

  it("POST / — fieldType poller'a geçer (harita glifi)", async () => {
    const registeredField = vi.fn().mockResolvedValue({ id: "f-9" });
    const app = await buildApp(makePoller({ registeredField }));
    const res = await app.inject({
      method: "POST",
      url: "/api/admin/fields/",
      payload: { name: "Rüzgar 1", fieldType: "wind" },
    });
    expect(res.statusCode).toBe(201);
    expect(registeredField).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Rüzgar 1", fieldType: "wind" }),
    );
  });

  it("PUT /:id — fieldType güncellemeye geçer", async () => {
    const updateField = vi.fn().mockResolvedValue({ id: "f-1", name: "yeni" });
    const app = await buildApp(makePoller({ updateField }));
    const res = await app.inject({
      method: "PUT",
      url: "/api/admin/fields/f-1",
      payload: { fieldType: "solar" },
    });
    expect(res.statusCode).toBe(200);
    expect(updateField).toHaveBeenCalledWith(
      "f-1",
      expect.objectContaining({ fieldType: "solar" }),
    );
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

  it("GET / — registry bağlıysa status online + last_seen_at (S1 overlay)", async () => {
    const registry = {
      isConnected: vi.fn().mockReturnValue(true),
      lastSeenAt: vi.fn().mockReturnValue(1700000000000),
    };
    const app = await buildApp(makePoller(), registry);
    const res = await app.inject({ method: "GET", url: "/api/admin/fields/" });
    expect(res.statusCode).toBe(200);
    const rows = res.json() as Array<Record<string, unknown>>;
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe("online");
    expect(rows[0].last_seen_at).toBe(new Date(1700000000000).toISOString());
  });

  it("GET / — bağlı sahanın boş özeti DEMO değerlerle dolar (field→cloud push öncesi)", async () => {
    const registry = {
      isConnected: vi.fn().mockReturnValue(true),
      lastSeenAt: vi.fn().mockReturnValue(1700000000000),
    };
    const app = await buildApp(
      makePoller({
        fields: vi.fn().mockResolvedValue([
          { id: "f-1", name: "Saha 1", container_count: 0, online_containers: 0 },
        ]),
      }),
      registry,
    );
    const res = await app.inject({ method: "GET", url: "/api/admin/fields/" });
    const rows = res.json() as Array<Record<string, unknown>>;
    expect(rows[0].status).toBe("online");
    expect(rows[0].container_count).toBe(1);
    expect(rows[0].online_containers).toBe(1);
    expect(rows[0].total_power_mw).toBe(0.25);
    expect(rows[0].avg_soc).toBe(87.0);
    expect(rows[0].active_alarms).toBe(0);
  });

  it("GET / — bağlı sahanın dolu özeti DEMO ile EZİLMEZ", async () => {
    const registry = {
      isConnected: vi.fn().mockReturnValue(true),
      lastSeenAt: vi.fn().mockReturnValue(1700000000000),
    };
    const app = await buildApp(
      makePoller({
        fields: vi.fn().mockResolvedValue([
          { id: "f-1", name: "Saha 1", container_count: 3, online_containers: 2 },
        ]),
      }),
      registry,
    );
    const res = await app.inject({ method: "GET", url: "/api/admin/fields/" });
    const rows = res.json() as Array<Record<string, unknown>>;
    expect(rows[0].container_count).toBe(3);
    expect(rows[0].online_containers).toBe(2);
    expect(rows[0].status).toBe("online");
  });

  it("GET / — registry bağlı değilse DB durumu korunur", async () => {
    const registry = {
      isConnected: vi.fn().mockReturnValue(false),
      lastSeenAt: vi.fn(),
    };
    const app = await buildApp(makePoller(), registry);
    const res = await app.inject({ method: "GET", url: "/api/admin/fields/" });
    const rows = res.json() as Array<Record<string, unknown>>;
    expect(rows[0].status).toBeUndefined();
    expect(rows[0].last_seen_at).toBeUndefined();
  });

  it("GET /:id — registry bağlıysa overlay uygulanır", async () => {
    const registry = {
      isConnected: vi.fn().mockReturnValue(true),
      lastSeenAt: vi.fn().mockReturnValue(1700000000000),
    };
    const app = await buildApp(makePoller(), registry);
    const res = await app.inject({ method: "GET", url: "/api/admin/fields/f-1" });
    expect(res.statusCode).toBe(200);
    const row = res.json() as Record<string, unknown>;
    expect(row.status).toBe("online");
    expect(row.last_seen_at).toBe(new Date(1700000000000).toISOString());
  });
});
