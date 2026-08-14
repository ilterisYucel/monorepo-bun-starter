import { describe, expect, it } from "vitest";
import type { ISqlDatabase } from "@gd-monorepo/core";
import { ExternalSeriesWriter } from "./external-series-writer";

class FakeSql implements ISqlDatabase {
  executed: Array<{ sql: string; params?: unknown[] }> = [];
  rows: unknown[] = [];
  disconnected = false;

  async connect(): Promise<void> {}
  async disconnect(): Promise<void> {
    this.disconnected = true;
  }
  async execute(sql: string, params?: unknown[]): Promise<void> {
    this.executed.push({ sql, params });
  }
  async query<T>(_sql: string, _params?: unknown[]): Promise<T[]> {
    return this.rows as T[];
  }
  async queryOne<T>(_sql: string, _params?: unknown[]): Promise<T | undefined> {
    return (this.rows[0] as T) ?? undefined;
  }
  async health(): Promise<boolean> {
    return true;
  }
}

describe("ExternalSeriesWriter", () => {
  it("init tablo, hypertable ve index olusturur", async () => {
    const sql = new FakeSql();
    const writer = new ExternalSeriesWriter(sql);

    await writer.init();

    expect(sql.executed).toHaveLength(3);
    expect(sql.executed[0]?.sql).toContain("CREATE TABLE IF NOT EXISTS external_series");
    expect(sql.executed[1]?.sql).toContain("create_hypertable");
    expect(sql.executed[2]?.sql).toContain("idx_external_series_source_series");
  });

  it("write upsert SQL uretir ve parametreleri sirali gecer", async () => {
    const sql = new FakeSql();
    const writer = new ExternalSeriesWriter(sql);

    await writer.write([
      {
        source: "epias",
        series: "MCP",
        timestamp: "2026-08-14T10:00:00.000Z",
        value: 1900.5,
        unit: "TRY/MWh",
        tags: { region: "TR1" },
      },
      {
        source: "epias",
        series: "MCP",
        timestamp: "2026-08-14T11:00:00.000Z",
        value: 1950.25,
        unit: "TRY/MWh",
      },
    ]);

    expect(sql.executed).toHaveLength(1);
    const call = sql.executed[0]!;
    expect(call.sql).toContain("INSERT INTO external_series");
    expect(call.sql).toContain("ON CONFLICT (source, series, timestamp)");
    expect(call.params).toEqual([
      "epias",
      "MCP",
      "2026-08-14T10:00:00.000Z",
      1900.5,
      "TRY/MWh",
      '{"region":"TR1"}',
      "epias",
      "MCP",
      "2026-08-14T11:00:00.000Z",
      1950.25,
      "TRY/MWh",
      "{}",
    ]);
  });

  it("bos listede write hicbir SQL calistirmaz", async () => {
    const sql = new FakeSql();
    const writer = new ExternalSeriesWriter(sql);

    await writer.write([]);

    expect(sql.executed).toHaveLength(0);
  });

  it("query satirlari MarketDataPoint'e cevirir", async () => {
    const sql = new FakeSql();
    sql.rows = [
      {
        source: "epias",
        series: "MCP",
        timestamp: new Date("2026-08-14T10:00:00.000Z"),
        value: 1900.5,
        unit: "TRY/MWh",
        tags: { region: "TR1" },
      },
    ];
    const writer = new ExternalSeriesWriter(sql);

    const points = await writer.query(
      "epias",
      "MCP",
      "2026-08-14T00:00:00Z",
      "2026-08-15T00:00:00Z",
    );

    expect(points).toHaveLength(1);
    expect(points[0]).toMatchObject({
      source: "epias",
      series: "MCP",
      timestamp: "2026-08-14T10:00:00.000Z",
      value: 1900.5,
      tags: { region: "TR1" },
    });
  });

  it("close baglantiyi kapatir", async () => {
    const sql = new FakeSql();
    const writer = new ExternalSeriesWriter(sql);

    await writer.close();

    expect(sql.disconnected).toBe(true);
  });
});
