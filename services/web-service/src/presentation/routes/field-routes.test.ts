import { describe, it, expect, vi, beforeEach } from "vitest";
import Fastify from "fastify";
import { fieldRoutes } from "./field-routes";
import type { ISqlDatabase } from "@gd-monorepo/core";
import type { User } from "@gd-monorepo/shared-types";
import type { ContainerProxy } from "../../infrastructure/container-proxy/container-proxy";

/**
 * field-routes KARAKTERİZASYONU (TESTING.md §8.2) — Faz 1 T1.2/T1.3
 * değişikliklerinden ÖNCE mevcut davranışı sabitler (bug dahil):
 * - `userCanAccessField`: admin/boss → tüm sahalar; teknik → fieldIds listesi.
 * - 2026-08-28: saha REGISTRY uçları (liste/oluştur/güncelle/sil) field
 *   stack'ten KALDIRILDI — tek saha modeli (FIELD_ID env + açılış seed'i).
 *   Burada yalnızca saha başına veri uçları (summary/containers/telemetry)
 *   ve konteyner register'ı test edilir.
 */

const mockUser = (overrides: Partial<User> = {}): User => ({
  id: "u-1",
  username: "u",
  role: "teknik",
  name: "U",
  fieldIds: ["f-1"],
  createdAt: "",
  updatedAt: "",
  ...overrides,
});

function makeDb(overrides: Partial<ISqlDatabase> = {}): ISqlDatabase {
  return {
    connect: vi.fn(),
    disconnect: vi.fn(),
    execute: vi.fn().mockResolvedValue(undefined),
    query: vi.fn().mockImplementation((sql: string) => {
      if (sql.includes("FROM fields")) {
        return Promise.resolve([{ id: "f-1", name: "Saha 1" }, { id: "f-2", name: "Saha 2" }]);
      }
      if (sql.includes("FROM field_containers")) {
        return Promise.resolve([{ field_id: "f-1", container_id: "c-1", container_url: "", layout: {} }]);
      }
      return Promise.resolve([]);
    }),
    queryOne: vi.fn().mockImplementation((sql: string) => {
      if (sql.includes("INSERT INTO fields")) {
        return Promise.resolve({ id: "f-9", name: "Yeni" });
      }
      if (sql.includes("UPDATE fields")) {
        return Promise.resolve({ id: "f-1", name: "guncel" });
      }
      if (sql.includes("FROM fields")) {
        return Promise.resolve({ id: "f-1", name: "Saha 1" });
      }
      return Promise.resolve(undefined);
    }),
    health: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
}

function makeProxy(): ContainerProxy {
  return {
    latestTelemetry: vi.fn().mockReturnValue([]),
    connectionStatus: vi.fn().mockReturnValue(new Map([["c-1", "idle"]])),
    lastSeenAt: vi.fn().mockReturnValue(undefined),
    pushConfigUpdate: vi.fn(),
    historical: vi.fn().mockResolvedValue([]),
    allHistorical: vi.fn().mockResolvedValue({}),
    start: vi.fn(),
    stop: vi.fn(),
  } as unknown as ContainerProxy;
}

async function buildApp(opts: {
  user?: User;
  db?: ISqlDatabase;
  proxy?: ContainerProxy | undefined;
}) {
  const app = Fastify();
  app.addHook("onRequest", (request, _reply, done) => {
    if (opts.user) {
      (request as unknown as { user: User }).user = opts.user;
    }
    done();
  });
  await app.register(
    async (fastify) => {
      await fieldRoutes(fastify, {
        db: opts.db ?? makeDb(),
        containerProxy: opts.proxy,
      });
    },
    { prefix: "/api/fields" },
  );
  return app;
}

describe("field-routes karakterizasyon (mevcut davranış)", () => {
  let db: ISqlDatabase;
  let proxy: ContainerProxy;

  beforeEach(() => {
    db = makeDb();
    proxy = makeProxy();
  });

  it("T1.3: boş fieldIds'li teknik /:fieldId/containers erişEMEZ (403)", async () => {
    const app = await buildApp({ user: mockUser({ fieldIds: [] }), db, proxy });
    const res = await app.inject({ method: "GET", url: "/api/fields/f-1/containers" });
    expect(res.statusCode).toBe(403);
  });

  it("GET /:fieldId/summary → 200 yapı", async () => {
    const app = await buildApp({ user: mockUser({ role: "boss" }), db, proxy });
    const res = await app.inject({ method: "GET", url: "/api/fields/f-1/summary" });
    expect(res.statusCode).toBe(200);
    expect(res.json().containers).toHaveLength(1);
  });

  it("GET /:fieldId/containers → 200 + connectionStatus", async () => {
    const app = await buildApp({ user: mockUser({ role: "admin" }), db, proxy });
    const res = await app.inject({ method: "GET", url: "/api/fields/f-1/containers" });
    expect(res.statusCode).toBe(200);
    expect(res.json()[0].connectionStatus).toBe("idle");
  });

  it("T2.4: containers → gerçek lastSeenAt + stale durumu", async () => {
    const proxy = makeProxy();
    (proxy as unknown as { connectionStatus: ReturnType<typeof vi.fn> }).connectionStatus.mockReturnValue(
      new Map([["c-1", "stale"]]),
    );
    (proxy as unknown as { lastSeenAt: ReturnType<typeof vi.fn> }).lastSeenAt.mockReturnValue(1756116000000);
    const app = await buildApp({ user: mockUser({ role: "admin" }), db, proxy });
    const res = await app.inject({ method: "GET", url: "/api/fields/f-1/containers" });
    const body = res.json();
    expect(body[0].connectionStatus).toBe("stale");
    expect(body[0].lastSeenAt).toBe(new Date(1756116000000).toISOString());
  });

  it("T2.4: containers → lastSeenAt yoksa alan yok", async () => {
    const app = await buildApp({ user: mockUser({ role: "admin" }), db, proxy });
    const res = await app.inject({ method: "GET", url: "/api/fields/f-1/containers" });
    expect(res.json()[0].lastSeenAt).toBeUndefined();
  });

  it("T2.4: summary → gerçek lastSeenAt + stale ≠ connected", async () => {
    const proxy = makeProxy();
    (proxy as unknown as { connectionStatus: ReturnType<typeof vi.fn> }).connectionStatus.mockReturnValue(
      new Map([["c-1", "stale"]]),
    );
    (proxy as unknown as { lastSeenAt: ReturnType<typeof vi.fn> }).lastSeenAt.mockReturnValue(1756116000000);
    const app = await buildApp({ user: mockUser({ role: "boss" }), db, proxy });
    const res = await app.inject({ method: "GET", url: "/api/fields/f-1/summary" });
    const summary = res.json().containers[0];
    expect(summary.connected).toBe(false);
    expect(summary.lastSeenAt).toBe(new Date(1756116000000).toISOString());
  });

  it("GET /:fieldId/telemetry/latest → 200", async () => {
    const app = await buildApp({ user: mockUser({ role: "admin" }), db, proxy });
    const res = await app.inject({ method: "GET", url: "/api/fields/f-1/telemetry/latest" });
    expect(res.statusCode).toBe(200);
  });

  it("GET /:fieldId/telemetry/downsampled — proxy yoksa {} (kademeli)", async () => {
    const app = await buildApp({ user: mockUser({ role: "admin" }), db });
    const res = await app.inject({
      method: "GET",
      url: "/api/fields/f-1/telemetry/downsampled",
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({});
  });

  it("2026-08-28: saha registry uçları KALDIRILDI — POST/PUT/DELETE 404", async () => {
    const app = await buildApp({ user: mockUser({ role: "admin" }), db, proxy });
    for (const [method, url] of [
      ["POST", "/api/fields/"],
      ["PUT", "/api/fields/f-1"],
      ["DELETE", "/api/fields/f-1"],
    ] as const) {
      const res = await app.inject({
        method,
        url,
        payload: method === "POST" ? { name: "x" } : undefined,
      });
      expect(res.statusCode).toBe(404);
    }
  });

  it("2026-08-28: saha listesi ucu KALDIRILDI — GET / 404", async () => {
    const app = await buildApp({ user: mockUser({ role: "admin" }), db, proxy });
    const res = await app.inject({ method: "GET", url: "/api/fields/" });
    expect(res.statusCode).toBe(404);
  });

  it("T1.2: register endpoint'i admin için 201 — yalnızca hash saklanır", async () => {
    const app = await buildApp({ user: mockUser({ role: "admin" }), db, proxy });
    const token = "t".repeat(32);
    const res = await app.inject({
      method: "POST",
      url: "/api/fields/f-1/containers/c-1/register",
      payload: { token },
    });
    expect(res.statusCode).toBe(201);
    const insertCall = (db.execute as ReturnType<typeof vi.fn>).mock.calls.find((c) =>
      String(c[0]).includes("INSERT INTO field_containers"),
    );
    expect(insertCall).toBeDefined();
    expect(JSON.stringify(insertCall)).not.toContain(token);
    // 2026-08-30: container_url artık DB'ye YAZILMAZ (URL mimarinin alanı değil)
    expect(String(insertCall?.[0])).not.toContain("container_url");
  });

  it("T1.2: kısa token → 400", async () => {
    const app = await buildApp({ user: mockUser({ role: "admin" }), db, proxy });
    const res = await app.inject({
      method: "POST",
      url: "/api/fields/f-1/containers/c-1/register",
      payload: { token: "kisa" },
    });
    expect(res.statusCode).toBe(400);
  });

  it("2026-08-30: payload'daki containerUrl YOK SAYILIR — 201 + DB'ye yazılmaz", async () => {
    const app = await buildApp({ user: mockUser({ role: "admin" }), db, proxy });
    const res = await app.inject({
      method: "POST",
      url: "/api/fields/f-1/containers/c-1/register",
      payload: { containerUrl: "file:///etc/passwd", token: "t".repeat(32) },
    });
    expect(res.statusCode).toBe(201);
    const insertCall = (db.execute as ReturnType<typeof vi.fn>).mock.calls.find((c) =>
      String(c[0]).includes("INSERT INTO field_containers"),
    );
    expect(String(insertCall?.[0])).not.toContain("container_url");
  });

  it("T1.2: teknik → 403", async () => {
    const app = await buildApp({ user: mockUser(), db, proxy });
    const res = await app.inject({
      method: "POST",
      url: "/api/fields/f-1/containers/c-1/register",
      payload: { token: "t".repeat(32) },
    });
    expect(res.statusCode).toBe(403);
  });

  it("T1.2: bilinmeyen saha → 404", async () => {
    const db404 = makeDb({
      queryOne: vi.fn().mockImplementation((sql: string) => {
        if (sql.includes("INSERT INTO fields")) return Promise.resolve({ id: "f-9" });
        return Promise.resolve(undefined);
      }),
    });
    const app = await buildApp({ user: mockUser({ role: "admin" }), db: db404, proxy });
    const res = await app.inject({
      method: "POST",
      url: "/api/fields/f-x/containers/c-1/register",
      payload: { token: "t".repeat(32) },
    });
    expect(res.statusCode).toBe(404);
  });
});
