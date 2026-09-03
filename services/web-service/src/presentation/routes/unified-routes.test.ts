import { describe, it, expect, vi } from "vitest";
import Fastify from "fastify";
import { unifiedRoutes } from "./unified-routes";
import { RequestContext, createRequestIdHook } from "../middleware/request-context";
import { createErrorHandler } from "../middleware/error-handler";
import type { ITimeseriesDatabase, ISqlDatabase, MaterializedViewManager } from "@gd-monorepo/core";
import type { DeviceRegistry } from "../../infrastructure/persistence/device-registry";

vi.mock("../../infrastructure/config-loader", () => ({
  loadDeviceConfig: vi.fn().mockReturnValue({
    deviceId: "bsc-1",
    name: "BSC 1",
    protocol: "modbus",
    connection: {},
    telemetry: [],
  }),
}));

/**
 * unified-routes sözleşmesi (Faz 0 T0.6):
 * - Başarı yolları ve parametre doğrulamaları karakterizasyondaki gibi kalır.
 * - `Promise.allSettled` kısmi başarı + console.warn davranışı KORUNUR
 *   (kademeli bozulma tasarımı — tüm cihazlar düşse bile kısmi yanıt).
 * - Dış try/catch kaldırılır: altyapı hatası sınıra ulaşır (500, tek log).
 */

function makeRegistry(overrides: Partial<DeviceRegistry> = {}): DeviceRegistry {
  return {
    refresh: vi.fn().mockResolvedValue(undefined),
    online: vi.fn().mockReturnValue([{ id: "bsc-1" }]),
    ...overrides,
  } as unknown as DeviceRegistry;
}

function makeTimescale(overrides: Partial<ITimeseriesDatabase> = {}): ITimeseriesDatabase {
  return {
    write: vi.fn(),
    query: vi.fn(),
    aggregate: vi.fn(),
    getDownsampledData: vi.fn().mockResolvedValue([]),
    getLatest: vi.fn(),
    getLatestN: vi.fn().mockResolvedValue([{ deviceId: "bsc-1", name: "Voltage" }]),
    listDevices: vi.fn(),
    runRetention: vi.fn(),
    executeRaw: vi.fn().mockResolvedValue({ rows: [{ name: "Voltage" }] }),
    close: vi.fn(),
    health: vi.fn().mockResolvedValue(true),
    ...overrides,
  } as unknown as ITimeseriesDatabase;
}

function makeMv(): MaterializedViewManager {
  return {
    ensureMaterializedViews: vi.fn().mockResolvedValue(undefined),
    selectView: vi.fn().mockReturnValue("device_bsc_1_1_hour"),
    existingViews: vi.fn().mockResolvedValue(["device_bsc_1_1_hour"]),
  } as unknown as MaterializedViewManager;
}

function makePostgres(overrides: Partial<ISqlDatabase> = {}): ISqlDatabase {
  return {
    connect: vi.fn(),
    disconnect: vi.fn(),
    execute: vi.fn().mockResolvedValue(undefined),
    query: vi.fn().mockResolvedValue([{ id: "p-1" }]),
    queryOne: vi.fn(),
    health: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
}

interface Deps {
  registry?: DeviceRegistry;
  timescale?: ITimeseriesDatabase;
  mvManager?: MaterializedViewManager;
  postgres?: ISqlDatabase;
  withBoundary?: boolean;
}

async function buildApp(deps: Deps = {}) {
  const app = Fastify();
  if (deps.withBoundary) {
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
      await unifiedRoutes(fastify, {
        registry: deps.registry ?? makeRegistry(),
        timescale: deps.timescale ?? makeTimescale(),
        mvManager: deps.mvManager ?? makeMv(),
        postgres: deps.postgres ?? makePostgres(),
      });
    },
    { prefix: "/api/unified" },
  );
  return app;
}

describe("unified-routes (T0.6)", () => {
  it("GET /telemetry/latest → 200 {telemetries}", async () => {
    const app = await buildApp();
    const res = await app.inject({ method: "GET", url: "/api/unified/telemetry/latest" });
    expect(res.statusCode).toBe(200);
    expect(res.json().telemetries).toHaveLength(1);
  });

  it("GET /telemetry/latest — kısmi başarı: cihaz hatası warn + boş sonuç (allSettled korunur)", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const timescale = makeTimescale({
        getLatestN: vi.fn().mockRejectedValue(new Error("device down")),
      });
      const app = await buildApp({ timescale });
      const res = await app.inject({ method: "GET", url: "/api/unified/telemetry/latest" });
      expect(res.statusCode).toBe(200);
      expect(res.json().telemetries).toEqual([]);
      expect(warn).toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });

  it("GET /telemetry/downsampled — from/to yoksa 400", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "GET",
      url: "/api/unified/telemetry/downsampled",
    });
    expect(res.statusCode).toBe(400);
  });

  it("GET /telemetry/downsampled → 200", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "GET",
      url: "/api/unified/telemetry/downsampled?from=2026-08-01T00:00:00Z&to=2026-08-02T00:00:00Z",
    });
    expect(res.statusCode).toBe(200);
  });

  it("GET /telemetry/:deviceId → 200 {deviceId, interval, dataPointCount, data}", async () => {
    const app = await buildApp();
    const res = await app.inject({ method: "GET", url: "/api/unified/telemetry/bsc-1" });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.deviceId).toBe("bsc-1");
    expect(body.data).toEqual([{ name: "Voltage" }]);
  });

  it("GET /devices/:deviceId/telemetry-config — config yoksa 404", async () => {
    vi.mocked(
      (await import("../../infrastructure/config-loader")).loadDeviceConfig,
    ).mockReturnValueOnce(null);
    const app = await buildApp();
    const res = await app.inject({
      method: "GET",
      url: "/api/unified/devices/yok/telemetry-config",
    });
    expect(res.statusCode).toBe(404);
  });

  it("GET /devices/:deviceId/telemetry-config → 200", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "GET",
      url: "/api/unified/devices/bsc-1/telemetry-config",
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().deviceId).toBe("bsc-1");
  });

  it("GET /timeseries/hypertables → 200 {hypertables}", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "GET",
      url: "/api/unified/timeseries/hypertables",
    });
    expect(res.statusCode).toBe(200);
  });

  it("GET /timeseries/hypertables/:name → 200", async () => {
    const timescale = makeTimescale({
      executeRaw: vi.fn().mockResolvedValue({ rows: [] }),
    });
    const app = await buildApp({ timescale });
    const res = await app.inject({
      method: "GET",
      url: "/api/unified/timeseries/hypertables/device_bsc_1",
    });
    expect(res.statusCode).toBe(200);
  });

  it("GET /timeseries/materialized-views → 200", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "GET",
      url: "/api/unified/timeseries/materialized-views",
    });
    expect(res.statusCode).toBe(200);
  });

  it("POST /timeseries/materialized-views — hypertable yoksa 400", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/api/unified/timeseries/materialized-views",
      payload: {},
    });
    expect(res.statusCode).toBe(400);
  });

  it("POST /timeseries/materialized-views → 200", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/api/unified/timeseries/materialized-views",
      payload: { hypertable: "device_bsc_1" },
    });
    expect(res.statusCode).toBe(200);
  });

  it("GET /projects → 200 {projects}", async () => {
    const app = await buildApp();
    const res = await app.inject({ method: "GET", url: "/api/unified/projects" });
    expect(res.statusCode).toBe(200);
    expect(res.json().projects).toHaveLength(1);
  });

  it("POST /projects → 201 {id}", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/api/unified/projects",
      payload: { name: "p", nodes: [], edges: [] },
    });
    expect(res.statusCode).toBe(201);
  });

  it("PUT /projects/:id → 200", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "PUT",
      url: "/api/unified/projects/p-1",
      payload: { name: "p", nodes: [], edges: [] },
    });
    expect(res.statusCode).toBe(200);
  });

  it("DELETE /projects/:id → 200 {success}", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "DELETE",
      url: "/api/unified/projects/p-1",
    });
    expect(res.statusCode).toBe(200);
  });

  it("altyapı hatası sınıra ulaşır — console.error yok, 500", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const timescale = makeTimescale({
        executeRaw: vi.fn().mockRejectedValue(new Error("db down")),
      });
      const app = await buildApp({ timescale, withBoundary: true });
      const res = await app.inject({
        method: "GET",
        url: "/api/unified/timeseries/hypertables",
      });
      expect(res.statusCode).toBe(500);
      expect(res.json().error).toBe("Internal server error");
      expect(consoleSpy).not.toHaveBeenCalled();
    } finally {
      consoleSpy.mockRestore();
    }
  });
});
