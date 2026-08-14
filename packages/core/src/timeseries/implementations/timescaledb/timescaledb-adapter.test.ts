import { describe, it, expect, vi } from "vitest";
import { TimescaleDBAdapter } from "./timescaledb-adapter";
import type { TimescaleDBConfig } from "./timescaledb-config";

function makeConfig(): TimescaleDBConfig {
  return {
    host: "localhost",
    port: 5432,
    user: "postgres",
    password: "",
    database: "battery",
    maxConnections: 2,
    chunkInterval: "6 hours",
    compressAfter: "1 day",
    retentionAfter: "90 days",
    statementTimeoutMs: 30000,
    idleTimeoutMs: 30000,
    connectionTimeoutMs: 5000,
  };
}

function capturePool() {
  const queries: { sql: string; params: unknown[] }[] = [];
  const pool = {
    query: vi.fn(async (sql: string, params?: unknown[]) => {
      queries.push({ sql, params: params ?? [] });
      return { rows: [] as Record<string, unknown>[] };
    }),
  };
  return { pool: pool as never, queries };
}

const FROM = new Date("2026-08-13T10:00:00.000Z");
const TO = new Date("2026-08-13T11:00:00.000Z");

describe("TimescaleDBAdapter — bucket origin hizalaması (Grafana kuralı)", () => {
  it("aggregate: bucket'lar sorgunun from zamanına hizalanır (origin=$1)", async () => {
    const { pool, queries } = capturePool();
    const adapter = new TimescaleDBAdapter(makeConfig(), pool);

    await adapter.aggregate({
      deviceId: "BSC-1",
      aggregateFn: "AVG",
      interval: "1 minute",
      from: FROM,
      to: TO,
    });

    const aggregateSql = queries.find((q) => q.sql.includes("time_bucket"))!;
    expect(aggregateSql.sql).toContain("time_bucket('1 minute', timestamp, $1)");
    expect(aggregateSql.params[0]).toBe(FROM);
  });

  it("getDownsampledData: bucket'lar from ISO zamanına hizalanır (origin literal)", async () => {
    const { pool, queries } = capturePool();
    const adapter = new TimescaleDBAdapter(makeConfig(), pool);

    await adapter.getDownsampledData({
      deviceId: "BSC-1",
      names: ["SOC"],
      from: FROM,
      to: TO,
      points: 120,
    });

    const downsampleSql = queries.find((q) => q.sql.includes("time_bucket"))!;
    expect(downsampleSql.sql).toContain(
      `time_bucket(`,
    );
    expect(downsampleSql.sql).toContain(
      `'${FROM.toISOString()}'::timestamptz`,
    );
  });
});
