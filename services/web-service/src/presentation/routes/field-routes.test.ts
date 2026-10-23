import { describe, it, expect, vi, beforeEach } from "vitest";
import Fastify from "fastify";
import { fieldRoutes } from "./field-routes";
import type { ISqlDatabase } from "@gd-monorepo/core";
import type { User } from "@gd-monorepo/shared-types";
import type { IContainerProxy } from "@gd-monorepo/platform-container-access";
import { GetFieldContainersUseCase } from "../../application/telemetry/get-field-containers-use-case";
import { GetContainerTelemetryUseCase } from "../../application/telemetry/get-container-telemetry-use-case";

/**
 * field-routes KARAKTERİZASYONU (TESTING.md §8.2) — Faz 1 T1.2/T1.3
 * değişikliklerinden ÖNCE mevcut davranışı sabitler (bug dahil):
 * - `userCanAccessField`: admin/boss → tüm sahalar; teknik → fieldIds listesi.
 * - 2026-08-28: saha REGISTRY uçları (liste/oluştur/güncelle/sil) field
 *   stack'ten KALDIRILDI — tek saha modeli (FIELD_ID env + açılış seed'i).
 *   Burada yalnızca saha başına veri uçları (summary/containers/telemetry)
 *   test edilir; konteyner listesi hub peer'larından türetilir.
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

function makeProxy(): IContainerProxy {
  return {
    latestTelemetry: vi.fn().mockReturnValue([]),
    latestQuery: vi.fn().mockResolvedValue([]),
    connectionStatus: vi.fn().mockReturnValue(new Map([["c-1", "idle"]])),
    lastSeenAt: vi.fn().mockReturnValue(undefined),
    containerIds: vi.fn().mockReturnValue(["c-1"]),
    pushConfigUpdate: vi.fn(),
    historical: vi.fn().mockResolvedValue([]),
    allHistorical: vi.fn().mockResolvedValue({}),
    start: vi.fn(),
    stop: vi.fn(),
  } as unknown as IContainerProxy;
}

async function buildApp(opts: {
  user?: User;
  db?: ISqlDatabase;
  proxy?: IContainerProxy | undefined;
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
        ...(opts.proxy
          ? {
              containers: new GetFieldContainersUseCase(opts.proxy),
              telemetry: new GetContainerTelemetryUseCase(opts.proxy),
            }
          : {}),
      });
    },
    { prefix: "/api/fields" },
  );
  return app;
}

describe("field-routes karakterizasyon (mevcut davranış)", () => {
  let db: ISqlDatabase;
  let proxy: IContainerProxy;

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

  it("GET /:fieldId/containers — liste hub peer'larından (containerIds) türetilir", async () => {
    const app = await buildApp({ user: mockUser({ role: "admin" }), db, proxy });
    const res = await app.inject({ method: "GET", url: "/api/fields/f-1/containers" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([
      expect.objectContaining({ containerId: "c-1", connectionStatus: "idle" }),
    ]);
    expect(proxy.containerIds).toHaveBeenCalled();
  });

  it("GET /:fieldId/telemetry/latest — anahtarlar hub container id'leridir", async () => {
    const app = await buildApp({ user: mockUser({ role: "admin" }), db, proxy });
    const res = await app.inject({
      method: "GET",
      url: "/api/fields/f-1/telemetry/latest",
    });
    expect(res.statusCode).toBe(200);
    expect(Object.keys(res.json())).toEqual(["c-1"]);
  });

  it("containerProxy yoksa containers boş dizi döner", async () => {
    const app = await buildApp({ user: mockUser({ role: "admin" }), db });
    const res = await app.inject({ method: "GET", url: "/api/fields/f-1/containers" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([]);
  });
});
