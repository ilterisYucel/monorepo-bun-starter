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

describe("TimescaleDBAdapter — write/INSERT akışı (2026-08-30 T3)", () => {
  function makeWritePool(overrides: {
    clientQuery?: ReturnType<typeof vi.fn>;
    poolQuery?: ReturnType<typeof vi.fn>;
  } = {}) {
    const clientQuery =
      overrides.clientQuery ?? vi.fn().mockResolvedValue({ rows: [] });
    const poolQuery =
      overrides.poolQuery ?? vi.fn().mockResolvedValue({ rows: [] });
    const client = { query: clientQuery, release: vi.fn() };
    const pool = {
      query: poolQuery,
      connect: vi.fn().mockResolvedValue(client),
    };
    return { pool: pool as never, client, clientQuery, poolQuery };
  }

  const point = (deviceId: string, name: string, value: number) => ({
    deviceId,
    name,
    value,
    unit: "%",
    description: "d",
    timestamp: "2026-08-13T10:00:00.000Z",
  });

  it("multi-row INSERT + BEGIN/COMMIT üretir; tablo adı device_ önekli", async () => {
    const { pool, clientQuery } = makeWritePool();
    const adapter = new TimescaleDBAdapter(makeConfig(), pool);

    await adapter.write([
      point("BSC-1", "SOC", 80),
      point("BSC-1", "SOH", 95),
    ]);

    const sqls = clientQuery.mock.calls.map((c) => String(c[0]));
    expect(sqls[0]).toBe("BEGIN");
    expect(sqls.at(-1)).toBe("COMMIT");
    const insert = sqls.find((s) => s.includes("INSERT INTO"));
    expect(insert).toContain("INSERT INTO device_BSC_1");
    expect(insert).toContain("(name, value, unit, description, quality, tags, timestamp)");
  });

  it("boş girdi → havuz işlemi YAPILMAZ", async () => {
    const { pool, poolQuery, clientQuery } = makeWritePool();
    const adapter = new TimescaleDBAdapter(makeConfig(), pool);
    await adapter.write([]);
    expect(poolQuery).not.toHaveBeenCalled();
    expect(clientQuery).not.toHaveBeenCalled();
  });

  it("INSERT hatası → ROLLBACK; write hata YUTAR (allSettled — kademeli bozulma, pipeline durmaz)", async () => {
    const clientQuery = vi.fn()
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockRejectedValueOnce(new Error("insert boom")); // writeBatch
    const { pool, clientQuery: cq } = makeWritePool({ clientQuery });
    const adapter = new TimescaleDBAdapter(makeConfig(), pool);

    // Mevcut davranış: cihaz bazlı yazma hataları allSettled ile YUTULUR
    // (warn logu basılır) — telemetri pipeline'ı durmaz.
    await expect(adapter.write([point("BSC-1", "SOC", 80)])).resolves.toBeUndefined();
    const sqls = cq.mock.calls.map((c) => String(c[0]));
    expect(sqls).toContain("ROLLBACK");
  });

  it("ensureTableExists tablo DDL'ini yalnızca bir kez çalıştırır (tablo önbelleği)", async () => {
    const { pool, poolQuery } = makeWritePool();
    const adapter = new TimescaleDBAdapter(makeConfig(), pool);

    await adapter.write([point("BSC-1", "SOC", 80)]);
    await adapter.write([point("BSC-1", "SOC", 81)]);

    const ddlCalls = poolQuery.mock.calls.filter((c) =>
      String(c[0]).includes("CREATE TABLE"),
    );
    expect(ddlCalls).toHaveLength(1);
  });
});

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
