import { describe, it, expect, vi } from "vitest";
import { MarketSeries, MARKET_SERIES } from "./market-series";
import type { ISqlDatabase } from "@gd-monorepo/core";

/**
 * MarketSeries sözleşmesi (Faz 2):
 * - points: kaynak/seri/zaman aralığı filtresiyle kronolojik noktalar
 * - latest: son nokta — yoksa undefined
 * - average: aralık ortalaması — yoksa undefined
 */

function makeSql(rows: unknown[]) {
  const query = vi.fn().mockResolvedValue(rows);
  const execute = vi.fn().mockResolvedValue(undefined);
  return {
    query,
    execute,
    queryOne: vi.fn(),
    health: vi.fn().mockResolvedValue(true),
    disconnect: vi.fn(),
  } as unknown as ISqlDatabase;
}

describe("MarketSeries (Faz 2)", () => {
  it("points kronolojik noktaları ISO timestamp'e çevirir", async () => {
    const sql = makeSql([
      { timestamp: new Date("2026-09-06T10:00:00Z"), value: 2450, unit: "TL/MWh" },
    ]);
    const market = new MarketSeries(sql);
    const points = await market.points(MARKET_SERIES.ptf, "2026-09-05T00:00:00Z", "2026-09-07T00:00:00Z");
    expect(points).toHaveLength(1);
    expect(points[0]?.timestamp).toBe("2026-09-06T10:00:00.000Z");
    expect(sql.query).toHaveBeenCalledWith(
      expect.stringContaining("WHERE source = $1 AND series = $2"),
      ["epias", "ptf", "2026-09-05T00:00:00Z", "2026-09-07T00:00:00Z"],
    );
  });

  it("latest boş sonuçta undefined döner", async () => {
    const market = new MarketSeries(makeSql([]));
    expect(await market.latest(MARKET_SERIES.ptf)).toBeUndefined();
  });

  it("average NULL sonucu undefined'a eşler", async () => {
    const market = new MarketSeries(makeSql([{ avg: null }]));
    expect(await market.average(MARKET_SERIES.ptf, "a", "b")).toBeUndefined();
  });

  it("average sayısal sonucu döner", async () => {
    const market = new MarketSeries(makeSql([{ avg: 2400.25 }]));
    expect(await market.average(MARKET_SERIES.ptf, "a", "b")).toBe(2400.25);
  });
});
