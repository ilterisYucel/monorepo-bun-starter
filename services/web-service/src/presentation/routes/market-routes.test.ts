import { describe, it, expect, vi } from "vitest";
import Fastify from "fastify";
import { MarketSeries, MARKET_SERIES } from "../../infrastructure/market/market-series";
import { marketRoutes } from "./market-routes";

/**
 * market-routes sözleşmesi (Faz 2):
 * - GET /ptf + /gip-weighted-average → seri noktaları + lastUpdatedAt
 * - GET /summary → son PTF/GİP + gün ortalaması; veri yoksa null (kademeli bozulma)
 * - Varsayılan pencere 48 saat (from/to verilmezse)
 */

function makeMarket(overrides: Partial<MarketSeries> = {}): MarketSeries {
  return {
    points: vi.fn().mockResolvedValue([
      { timestamp: "2026-09-06T10:00:00.000Z", value: 2450.5, unit: "TL/MWh" },
    ]),
    latest: vi.fn().mockResolvedValue({
      timestamp: "2026-09-06T10:00:00.000Z",
      value: 2450.5,
      unit: "TL/MWh",
    }),
    average: vi.fn().mockResolvedValue(2400),
    ...overrides,
  } as unknown as MarketSeries;
}

async function buildApp(market: MarketSeries) {
  const app = Fastify();
  await app.register(
    async (fastify) => {
      await marketRoutes(fastify, { market });
    },
    { prefix: "/api/market" },
  );
  return app;
}

describe("market-routes (Faz 2)", () => {
  it("GET /ptf → 200 seri noktaları + lastUpdatedAt", async () => {
    const app = await buildApp(makeMarket());
    const res = await app.inject({ method: "GET", url: "/api/market/ptf" });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.series).toEqual(MARKET_SERIES.ptf);
    expect(body.points).toHaveLength(1);
    expect(body.lastUpdatedAt).toBe("2026-09-06T10:00:00.000Z");
  });

  it("GET /gip-weighted-average → 200", async () => {
    const app = await buildApp(makeMarket());
    const res = await app.inject({
      method: "GET",
      url: "/api/market/gip-weighted-average",
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().series).toEqual(MARKET_SERIES.gipWeightedAverage);
  });

  it("GET /summary → son değerler + gün ortalaması", async () => {
    const app = await buildApp(makeMarket());
    const res = await app.inject({ method: "GET", url: "/api/market/summary" });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.ptf.value).toBe(2450.5);
    expect(body.gipWeightedAverage.value).toBe(2450.5);
    expect(body.ptfDayAverage).toBe(2400);
    expect(body.lastUpdatedAt).toBe("2026-09-06T10:00:00.000Z");
  });

  it("veri yoksa summary null döner (kademeli bozulma — UI bozulmaz)", async () => {
    const app = await buildApp(
      makeMarket({
        latest: vi.fn().mockResolvedValue(undefined),
        average: vi.fn().mockResolvedValue(undefined),
      }),
    );
    const res = await app.inject({ method: "GET", url: "/api/market/summary" });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.ptf).toBeNull();
    expect(body.gipWeightedAverage).toBeNull();
    expect(body.ptfDayAverage).toBeNull();
    expect(body.lastUpdatedAt).toBeNull();
  });
});
