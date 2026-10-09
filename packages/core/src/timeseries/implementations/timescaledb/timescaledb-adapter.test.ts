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

  it("INSERT hatası → ROLLBACK; write REJECT eder (retry ön koşulu — K10)", async () => {
    const clientQuery = vi.fn()
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockRejectedValueOnce(new Error("insert boom")); // writeBatch
    const { pool, clientQuery: cq } = makeWritePool({ clientQuery });
    const adapter = new TimescaleDBAdapter(makeConfig(), pool);

    // K10: commit hatası YUTULMAZ — reject eder, böylece BullMQ retry + onFailed
    // gerçekten tetiklenir.
    await expect(adapter.write([point("BSC-1", "SOC", 80)])).rejects.toThrow(
      "insert boom",
    );
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

  it("ensureTableExists → retention politikasını da kurar (her tier; tablo başına bir kez)", async () => {
    const { pool, poolQuery } = makeWritePool();
    const adapter = new TimescaleDBAdapter(makeConfig(), pool);

    await adapter.write([point("PCS-1", "SOC", 80)]);
    const retention = poolQuery.mock.calls
      .map((c) => String(c[0]))
      .find((s) => s.includes("add_retention_policy"));
    expect(retention).toContain("device_PCS_1");
    expect(retention).toContain("90 days");

    // tablo önbelleği: ikinci yazımda yeniden kurulmaz
    await adapter.write([point("PCS-1", "SOC", 81)]);
    const retentionCalls = poolQuery.mock.calls.filter((c) =>
      String(c[0]).includes("add_retention_policy"),
    );
    expect(retentionCalls).toHaveLength(1);
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

describe("TimescaleDBAdapter — getDownsampledData uzun-format (Faz-1, K2/K6)", () => {
  const bucket = new Date("2026-08-13T10:00:00.000Z");

  function smartPool() {
    const queries: { sql: string; params: unknown[] }[] = [];
    const pool = {
      query: vi.fn(async (sql: string, params?: unknown[]) => {
        queries.push({ sql, params: params ?? [] });
        if (sql.includes("DISTINCT ON")) {
          return {
            rows: [
              { name: "Fault", tag_value: "1", unit: "-", tags: { rack_id: "1", device_id: "BSC-1" } },
              { name: "Fault", tag_value: "2", unit: "-", tags: { rack_id: "2", device_id: "BSC-1" } },
              { name: "SOC", tag_value: null, unit: "%", tags: { device_id: "BSC-1" } },
            ],
          };
        }
        // veri sorgusu
        return {
          rows: [
            { bucket, name: "Fault", tag_value: "1", avg: "1" },
            { bucket, name: "Fault", tag_value: "2", avg: "0" },
            { bucket, name: "SOC", tag_value: null, avg: "80.123456" },
          ],
        };
      }),
    };
    return { pool: pool as never, queries };
  }

  it("aynı isim farklı rack → ayrı seriler; meta'dan unit/tags yapıştırılır", async () => {
    const { pool, queries } = smartPool();
    const adapter = new TimescaleDBAdapter(makeConfig(), pool);

    const out = await adapter.getDownsampledData({
      deviceId: "BSC-1",
      names: ["Fault", "SOC"],
      from: FROM,
      to: TO,
      points: 120,
      tag: "rack_id",
    });

    expect(out).toHaveLength(3);
    const fault1 = out.find((t) => t.name === "Fault" && t.tags?.rack_id === "1")!;
    const fault2 = out.find((t) => t.name === "Fault" && t.tags?.rack_id === "2")!;
    expect(fault1.value).toBe(1);
    expect(fault2.value).toBe(0);
    const soc = out.find((t) => t.name === "SOC")!;
    expect(soc.unit).toBe("%");
    expect(soc.value).toBe(80.1235); // 4 hane yuvarlama
    expect(soc.description).toContain("Downsampled");

    const dataSql = queries.find((q) => q.sql.includes("AS avg"))!;
    expect(dataSql.sql).toContain("GROUP BY bucket, name, tags->>'rack_id'");
    expect(dataSql.sql).not.toContain("GROUP BY bucket, tags");
  });

  it("rack filtresi parametreli sorgu üretir", async () => {
    const { pool, queries } = smartPool();
    const adapter = new TimescaleDBAdapter(makeConfig(), pool);

    await adapter.getDownsampledData({
      deviceId: "BSC-1",
      names: ["Fault"],
      from: FROM,
      to: TO,
      points: 120,
      tags: { rack_id: "2" },
    });

    const dataSql = queries.find((q) => q.sql.includes("AS avg"))!;
    expect(dataSql.sql).toContain("tags->>'rack_id' = $");
    expect(dataSql.params).toContain("2");
  });

  it("tag verilmezse name-only gruplama (jenerik)", async () => {
    const { pool, queries } = smartPool();
    const adapter = new TimescaleDBAdapter(makeConfig(), pool);

    await adapter.getDownsampledData({
      deviceId: "BSC-1",
      names: ["SOC"],
      from: FROM,
      to: TO,
      points: 120,
    });

    const dataSql = queries.find((q) => q.sql.includes("AS avg"))!;
    expect(dataSql.sql).toContain("GROUP BY bucket, name\n");
    expect(dataSql.sql).not.toContain("tag_value");
  });

  it("geçersiz tag anahtarı yok sayılır (name-only; enjeksiyon yok)", async () => {
    const { pool, queries } = smartPool();
    const adapter = new TimescaleDBAdapter(makeConfig(), pool);

    await adapter.getDownsampledData({
      deviceId: "BSC-1",
      names: ["SOC"],
      from: FROM,
      to: TO,
      points: 120,
      tag: "rack_id;DROP TABLE x",
    });

    const dataSql = queries.find((q) => q.sql.includes("AS avg"))!;
    expect(dataSql.sql).not.toContain("DROP");
    expect(dataSql.sql).not.toContain("tag_value");
  });
});

describe("TimescaleDBAdapter — gapfill/locf (K7)", () => {
  const b = (min: number) => new Date(`2026-08-13T10:0${min}:00.000Z`);

  function gapPool() {
    const queries: { sql: string; params: unknown[] }[] = [];
    const pool = {
      query: vi.fn(async (sql: string, params?: unknown[]) => {
        queries.push({ sql, params: params ?? [] });
        if (sql.includes("DISTINCT ON")) {
          return { rows: [{ name: "SOC", rack_id: null, unit: "%", tags: {} }] };
        }
        return {
          rows: [
            { bucket: b(0), name: "SOC", rack_id: null, avg: "10", n: "1" },
            { bucket: b(1), name: "SOC", rack_id: null, avg: "10", n: "0" }, // 60s ≤ carry
            { bucket: b(2), name: "SOC", rack_id: null, avg: "10", n: "0" }, // 120s > carry → düşer
            { bucket: b(3), name: "SOC", rack_id: null, avg: "11", n: "1" },
            { bucket: b(4), name: "SOC", rack_id: null, avg: "11", n: "0" }, // 60s → kalır
          ],
        };
      }),
    };
    return { pool: pool as never, queries };
  }

  it("locfCarryMs=0 → gapfill YOK (mevcut davranış)", async () => {
    const { pool, queries } = capturePool();
    const adapter = new TimescaleDBAdapter(makeConfig(), pool);
    await adapter.getDownsampledData({ deviceId: "BSC-1", names: ["SOC"], from: FROM, to: TO, points: 120 });
    const dataSql = queries.find((q) => q.sql.includes("AS avg"))!;
    expect(dataSql.sql).not.toContain("time_bucket_gapfill");
    expect(dataSql.sql).not.toContain("locf(");
  });

  it("locfCarryMs>0 → gapfill+locf; taşıma sınırı dışı boşluk düşer", async () => {
    const { pool, queries } = gapPool();
    const adapter = new TimescaleDBAdapter({ ...makeConfig(), locfCarryMs: 60_000 }, pool);

    const out = await adapter.getDownsampledData({
      deviceId: "BSC-1", names: ["SOC"], from: FROM, to: TO, points: 60,
    });

    const dataSql = queries.find((q) => q.sql.includes("AS avg"))!;
    expect(dataSql.sql).toContain("time_bucket_gapfill");
    expect(dataSql.sql).toContain("locf(AVG(value))");
    // b(2) taşıma sınırı dışında düşer → 4 satır kalır
    expect(out.map((t) => (t.timestamp as Date).getUTCMinutes())).toEqual([0, 1, 3, 4]);
  });
});
