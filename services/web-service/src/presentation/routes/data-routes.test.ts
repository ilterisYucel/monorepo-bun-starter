import { describe, it, expect, vi } from "vitest";
import Fastify from "fastify";
import { dataRoutes } from "./data-routes";
import { RequestContext, createRequestIdHook } from "../middleware/request-context";
import { createErrorHandler } from "../middleware/error-handler";
import type { ITimeseriesDatabase } from "@gd-monorepo/core";

import type { LogEventInput } from "@gd-monorepo/tamper-logger";


/**
 * data-routes sözleşmesi (Faz 0 T0.6 sonrası):
 * - Başarılı yollar karakterizasyondaki gibi (200 + gövde).
 * - Parametre doğrulamaları (from/to zorunlu, fn geçersiz) 400 kalır.
 * - DomainError (ValidationError) sınıra yayılır: geçersiz tags JSON → 400.
 * - Altyapı hataları try/catch'siz sınıra ulaşır — sınır TEK log noktasıdır
 *   (500 + boundary log; route içinde console.* yoktur).
 */

function makeTimescale(overrides: Partial<ITimeseriesDatabase> = {}) {
  return {
    listDevices: vi.fn().mockResolvedValue([{ id: "bsc-1", name: "BSC 1" }]),
    getLatestN: vi.fn().mockResolvedValue([{ deviceId: "bsc-1", name: "Voltage" }]),
    query: vi.fn().mockResolvedValue([]),
    getDownsampledData: vi.fn().mockResolvedValue([]),
    aggregate: vi.fn().mockResolvedValue([]),
    write: vi.fn(),
    runRetention: vi.fn(),
    ...overrides,
  } as unknown as ITimeseriesDatabase;
}

async function buildApp(timescale: ITimeseriesDatabase, withBoundary = false) {
  const app = Fastify();
  if (withBoundary) {
    const context = new RequestContext();
    app.addHook("onRequest", createRequestIdHook(context));
    app.setErrorHandler(
      createErrorHandler({
        logger: { log: vi.fn().mockResolvedValue(undefined) },
        context,
      }),
    );
  }
  await app.register(
    async (fastify) => {
      await dataRoutes(fastify, { timescale });
    },
    { prefix: "/api/data" },
  );
  return app;
}

describe("data-routes karakterizasyon (mevcut davranış)", () => {
  it("GET /devices → 200 {devices}", async () => {
    const app = await buildApp(makeTimescale());
    const res = await app.inject({ method: "GET", url: "/api/data/devices" });
    expect(res.statusCode).toBe(200);
    expect(res.json().devices).toHaveLength(1);
  });

  it("GET /devices — hata → 500 genel mesaj", async () => {
    const app = await buildApp(
      makeTimescale({ listDevices: vi.fn().mockRejectedValue(new Error("db down")) }),
      true,
    );
    const res = await app.inject({ method: "GET", url: "/api/data/devices" });
    expect(res.statusCode).toBe(500);
    expect(res.json().error).toBe("Internal server error");
  });

  it("GET /:deviceId/latest → 200 {telemetries}", async () => {
    const app = await buildApp(makeTimescale());
    const res = await app.inject({ method: "GET", url: "/api/data/bsc-1/latest" });
    expect(res.statusCode).toBe(200);
    expect(res.json().telemetries).toHaveLength(1);
  });

  it("GET /:deviceId/range — from/to yoksa 400", async () => {
    const app = await buildApp(makeTimescale());
    const res = await app.inject({ method: "GET", url: "/api/data/bsc-1/range" });
    expect(res.statusCode).toBe(400);
  });

  it("GET /:deviceId/range → 200 {telemetries}", async () => {
    const app = await buildApp(makeTimescale());
    const res = await app.inject({
      method: "GET",
      url: "/api/data/bsc-1/range?from=2026-08-01T00:00:00Z&to=2026-08-02T00:00:00Z",
    });
    expect(res.statusCode).toBe(200);
  });

  it("GET /:deviceId/downsampled — from/to yoksa 400", async () => {
    const app = await buildApp(makeTimescale());
    const res = await app.inject({
      method: "GET",
      url: "/api/data/bsc-1/downsampled",
    });
    expect(res.statusCode).toBe(400);
  });

  it("GET /:deviceId/aggregate — fn geçersizse 400", async () => {
    const app = await buildApp(makeTimescale());
    const res = await app.inject({
      method: "GET",
      url: "/api/data/bsc-1/aggregate?from=2026-08-01T00:00:00Z&to=2026-08-02T00:00:00Z&fn=MEDIAN&interval=1 hour",
    });
    expect(res.statusCode).toBe(400);
  });

  it("GET /:deviceId/aggregate → 200 {buckets}", async () => {
    const app = await buildApp(makeTimescale());
    const res = await app.inject({
      method: "GET",
      url: "/api/data/bsc-1/aggregate?from=2026-08-01T00:00:00Z&to=2026-08-02T00:00:00Z&fn=AVG&interval=1 hour",
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().buckets).toBeDefined();
  });

  it("GET /:deviceId/aggregate — hata → 500", async () => {
    const app = await buildApp(
      makeTimescale({ aggregate: vi.fn().mockRejectedValue(new Error("x")) }),
      true,
    );
    const res = await app.inject({
      method: "GET",
      url: "/api/data/bsc-1/aggregate?from=2026-08-01T00:00:00Z&to=2026-08-02T00:00:00Z&fn=AVG&interval=1 hour",
    });
    expect(res.statusCode).toBe(500);
  });
});

describe("data-routes T0.6 sözleşmesi (DomainError propagasyonu)", () => {
  it("geçersiz tags JSON → ValidationError → 400 (önceki davranış: 500)", async () => {
    const app = await buildApp(makeTimescale(), true);
    const res = await app.inject({
      method: "GET",
      url: "/api/data/bsc-1/range?from=2026-08-01T00:00:00Z&to=2026-08-02T00:00:00Z&tags={bozuk",
    });
    expect(res.statusCode).toBe(400);
    const body = res.json();
    expect(body.code).toBe("invalid_tags");
  });

  it("geçerli tags JSON ayrıştırılır ve sorguya iletilir", async () => {
    const timescale = makeTimescale();
    const app = await buildApp(timescale, true);
    const res = await app.inject({
      method: "GET",
      url: '/api/data/bsc-1/range?from=2026-08-01T00:00:00Z&to=2026-08-02T00:00:00Z&tags={"rack_id":"r1"}',
    });
    expect(res.statusCode).toBe(200);
    const call = (timescale.query as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.tags).toEqual({ rack_id: "r1" });
  });

  it("route içinde console hata logu yoktur — altyapı hatası sınıra ulaşır", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const app = await buildApp(
        makeTimescale({ listDevices: vi.fn().mockRejectedValue(new Error("db down")) }),
        true,
      );
      const res = await app.inject({ method: "GET", url: "/api/data/devices" });
      expect(res.statusCode).toBe(500);
      expect(consoleSpy).not.toHaveBeenCalled();
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it("sınır logu altyapı hatasını request_failed olarak kaydeder", async () => {
    const boundaryLog = vi.fn().mockResolvedValue(undefined);
    const app = Fastify();
    const context = new RequestContext();
    app.addHook("onRequest", createRequestIdHook(context));
    app.setErrorHandler(
      createErrorHandler({
        logger: { log: boundaryLog },
        context,
      }),
    );
    await app.register(
      async (fastify) => {
        await dataRoutes(fastify, {
          timescale: makeTimescale({
            listDevices: vi.fn().mockRejectedValue(new Error("db down")),
          }),
        });
      },
      { prefix: "/api/data" },
    );
    await app.inject({
      method: "GET",
      url: "/api/data/devices",
      headers: { "x-request-id": "corr-9" },
    });
    expect(boundaryLog).toHaveBeenCalledTimes(1);
    const input = boundaryLog.mock.calls[0][0] as LogEventInput;
    expect(input.eventCode).toBe("request_failed");
    expect(input.correlationId).toBe("corr-9");
  });
});
