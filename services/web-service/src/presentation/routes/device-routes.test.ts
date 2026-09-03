import { describe, it, expect, vi } from "vitest";
import Fastify from "fastify";
import { deviceRoutes } from "./device-routes";
import { RequestContext, createRequestIdHook } from "../middleware/request-context";
import { createErrorHandler } from "../middleware/error-handler";
import type { ISqlDatabase } from "@gd-monorepo/core";

/**
 * device-routes sözleşmesi (Faz 0 T0.6 + Faz 5.1 B3):
 * - GET /api/unified/devices → 200 {devices}.
 * - Faz 5.1 B3: DB hatası/tablo yokluğu → 200 {devices: []} (kademeli bozulma).
 *   Field tier'da `devices` tablosu yoktur (field stack'inde device-service
 *   yok — cihazlar konteyner snapshot'ından gelir); 500 dönmek UI'ı boş
 *   bırakıyordu.
 */

function makePostgres(overrides: Partial<ISqlDatabase> = {}): ISqlDatabase {
  return {
    connect: vi.fn(),
    disconnect: vi.fn(),
    execute: vi.fn().mockResolvedValue(undefined),
    query: vi.fn().mockResolvedValue([{ id: "bsc-1", status: "online" }]),
    queryOne: vi.fn(),
    health: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
}

async function buildApp(postgres: ISqlDatabase) {
  const app = Fastify();
  await app.register(
    async (fastify) => {
      await deviceRoutes(fastify, { postgres });
    },
    { prefix: "/api/unified" },
  );
  return app;
}

describe("device-routes (T0.6 + Faz 5.1 B3)", () => {
  it("GET /devices → 200 {devices}", async () => {
    const app = await buildApp(makePostgres());
    const res = await app.inject({ method: "GET", url: "/api/unified/devices" });
    expect(res.statusCode).toBe(200);
    expect(res.json().devices).toHaveLength(1);
  });

  it("DB hatası → 200 {devices: []} (Faz 5.1 B3 — kademeli bozulma)", async () => {
    const app = await buildApp(
      makePostgres({ query: vi.fn().mockRejectedValue(new Error("tablo yok")) }),
    );
    const res = await app.inject({ method: "GET", url: "/api/unified/devices" });
    expect(res.statusCode).toBe(200);
    expect(res.json().devices).toEqual([]);
  });
});
