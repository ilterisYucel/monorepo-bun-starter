// packages/core/src/timeseries/TimescaleDBAdapter.ts

import { Pool } from "pg";
import type { TelemetryData, PostgresConfig } from "@gd-monorepo/shared-types";
import type {
  ITimeseriesDatabase,
  TimeSeriesQuery,
  AggregateQuery,
  DownsampleOptions,
} from "./interface";

import type { PoolClient } from "pg";
// import pLimit from "p-limit";
// const limit = pLimit(50);

export type TimescaleDBConfig = PostgresConfig;

export class TimescaleDBAdapter implements ITimeseriesDatabase {
  private pool: Pool;
  private tableCache: Set<string> = new Set();
  private nameUnitCache: Map<string, { names: string[]; unitMap: Map<string, string> }> = new Map();

  constructor(config: PostgresConfig) {
    const poolMax = config.maxConnections ?? (Number(process.env.TIMESCALE_POOL_SIZE) || 5);
    const statementTimeout = Number(process.env.TIMESCALE_STATEMENT_TIMEOUT_MS) || 30000;
    const idleTimeout = Number(process.env.TIMESCALE_IDLE_TIMEOUT_MS) || 30000;
    const connTimeout = Number(process.env.TIMESCALE_CONNECTION_TIMEOUT_MS) || 5000;
    this.pool = new Pool({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database,
      ssl: config.ssl,
      max: poolMax,
      statement_timeout: statementTimeout,
      idleTimeoutMillis: idleTimeout,
      connectionTimeoutMillis: connTimeout,
    });
  }

  private getTableName(deviceId: string): string {
    // deviceId'deki özel karakterleri temizle
    const safeDeviceId = deviceId.replace(/[^a-zA-Z0-9_]/g, "_");
    return `device_${safeDeviceId}`;
  }

  private async ensureTableExists(deviceId: string): Promise<void> {
    const tableName = this.getTableName(deviceId);

    if (this.tableCache.has(tableName)) return;

    const chunkInterval = process.env.TIMESCALE_CHUNK_INTERVAL || "1 day";
    const query = `
      CREATE TABLE IF NOT EXISTS ${tableName} (
        name VARCHAR(100) NOT NULL,
        value DOUBLE PRECISION NOT NULL,
        unit VARCHAR(50),
        description TEXT,
        quality INTEGER DEFAULT 1,
        tags JSONB,
        timestamp TIMESTAMPTZ NOT NULL
      );
      SELECT create_hypertable('${tableName}', 'timestamp', if_not_exists => TRUE, chunk_time_interval => INTERVAL '${chunkInterval}');
      CREATE INDEX IF NOT EXISTS idx_${tableName}_name ON ${tableName} (name, timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_${tableName}_timestamp ON ${tableName} (timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_${tableName}_tags ON ${tableName} USING GIN (tags jsonb_path_ops);
    `;

    await this.pool.query(query);
    await this.setupCompression(tableName);
    this.tableCache.add(tableName);
  }

  private async setupCompression(tableName: string): Promise<void> {
    try {
      await this.pool.query(`
        ALTER TABLE ${tableName} SET (
          timescaledb.compress,
          timescaledb.compress_segmentby = 'name'
        );
      `);
      const compressAfter = process.env.TIMESCALE_COMPRESS_AFTER || "7 days";
      await this.pool.query(`
        SELECT add_compression_policy('${tableName}', INTERVAL '${compressAfter}', if_not_exists => true);
      `);
    } catch {
      console.warn(`[TimescaleDB] Sikistirma politikasi kurulamadi: ${tableName}`);
    }
  }

  async runRetention(deviceId: string, retainAfter?: string): Promise<void> {
    const tableName = this.getTableName(deviceId);
    const after = retainAfter || process.env.TIMESCALE_RETENTION_AFTER;
    if (!after) return;
    try {
      await this.pool.query(`
        SELECT add_retention_policy('${tableName}', INTERVAL '${after}', if_not_exists => true);
      `);
      console.log(`[TimescaleDB] Retention: ${tableName} --> ${after}`);
    } catch {
      console.warn(`[TimescaleDB] Retention politikasi kurulamadi: ${tableName}`);
    }
  }

  async write(telemetries: TelemetryData | TelemetryData[]): Promise<void> {
    const items = Array.isArray(telemetries) ? telemetries : [telemetries];
    if (items.length === 0) return;

    // deviceId'ye göre grupla
    const groupedByDevice = new Map<string, TelemetryData[]>();
    for (const item of items) {
      if (!groupedByDevice.has(item.deviceId)) {
        groupedByDevice.set(item.deviceId, []);
      }
      groupedByDevice.get(item.deviceId)!.push(item);
    }

    // 🔥 Her device için AYRI CLIENT kullan (paralel çalışabilir)
    const devicePromises = Array.from(groupedByDevice.entries()).map(
      async ([deviceId, deviceTelemetries]) => {
        const client = await this.pool.connect(); // 🔥 Her biri için ayrı client
        try {
          await client.query("BEGIN");

          await this.ensureTableExists(deviceId);
          const tableName = this.getTableName(deviceId);

          // Aynı device içindeki telemetry'leri parallel yaz
          const writePromises = deviceTelemetries.map((telemetry) =>
            this.writeSingle(client, tableName, telemetry),
          );
          await Promise.all(writePromises);

          await client.query("COMMIT");
        } catch (error) {
          await client.query("ROLLBACK");
          throw error;
        } finally {
          client.release();
        }
      },
    );

    await Promise.all(devicePromises);
  }

  private async writeSingle(
    client: PoolClient,
    tableName: string,
    telemetry: TelemetryData,
  ): Promise<void> {
    const value = typeof telemetry.value === "number" ? telemetry.value : 0;
    const quality =
      telemetry.value !== undefined && telemetry.value !== null ? 1 : 0;

    const query = `
      INSERT INTO ${tableName} (name, value, unit, description, quality, tags, timestamp)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;

    await client.query(query, [
      telemetry.name,
      value,
      telemetry.unit,
      telemetry.description,
      quality,
      telemetry.tags ?? {}, // tags için boş obje (ileride doldurulabilir)
      new Date(telemetry.timestamp),
    ]);
  }

  async query(query: TimeSeriesQuery): Promise<TelemetryData[]> {
    if (!query.deviceId) {
      throw new Error("deviceId is required for query");
    }

    await this.ensureTableExists(query.deviceId);
    const tableName = this.getTableName(query.deviceId);

    let sql = `
    SELECT name, value, unit, description, timestamp, tags
    FROM ${tableName}
    WHERE timestamp BETWEEN $1 AND $2
  `;
    const params: unknown[] = [query.from, query.to];
    let paramIndex = 3;

    if (query.names && query.names.length > 0) {
      const placeholders = query.names
        .map((_, i) => `$${paramIndex + i}`)
        .join(", ");
      sql += ` AND name IN (${placeholders})`;
      params.push(...query.names);
      paramIndex += query.names.length;
    }

    if (query.tags) {
      for (const [key, value] of Object.entries(query.tags)) {
        sql += ` AND tags->>'${key}' = $${paramIndex}`;
        params.push(value);
        paramIndex++;
      }
    }

    if (query.order) {
      sql += ` ORDER BY timestamp ${query.order}`;
    }

    if (query.limit) {
      sql += ` LIMIT $${paramIndex}`;
      params.push(query.limit);
    }

    const result = await this.pool.query(sql, params);

    return result.rows.map((row) =>
      this.rowToTelemetryData(row, query.deviceId!),
    );
  }

  async aggregate(
    query: AggregateQuery,
  ): Promise<{ bucket: Date; value: number }[]> {
    if (!query.deviceId) {
      throw new Error("deviceId is required for aggregate");
    }

    await this.ensureTableExists(query.deviceId);
    const tableName = this.getTableName(query.deviceId);

    const aggregateFn = query.aggregateFn;
    const interval = query.interval;

    let sql = `
      SELECT 
        time_bucket('${interval}', timestamp) AS bucket,
        ${aggregateFn}(value) AS value
      FROM ${tableName}
      WHERE timestamp BETWEEN $1 AND $2
    `;
    const params: unknown[] = [query.from, query.to];
    let paramIndex = 3;

    if (query.names && query.names.length > 0) {
      const placeholders = query.names
        .map((_, i) => `$${paramIndex + i}`)
        .join(", ");
      sql += ` AND name IN (${placeholders})`;
      params.push(...query.names);
      paramIndex += query.names.length;
    }

    if (query.tags) {
      for (const [key, value] of Object.entries(query.tags)) {
        sql += ` AND tags->>'${key}' = $${paramIndex}`;
        params.push(value);
        paramIndex++;
      }
    }

    sql += ` GROUP BY bucket ORDER BY bucket ${query.order ?? "ASC"}`;

    const result = await this.pool.query(sql, params);
    return result.rows.map((row) => ({
      bucket: row.bucket,
      value: parseFloat(row.value),
    }));
  }

  async getLatest(
    deviceId: string,
    name?: string,
    tags?: Record<string, string>,
  ): Promise<TelemetryData | null> {
    const results = await this.getLatestN(deviceId, 1, name, tags);
    return results[0] ?? null;
  }

  async getLatestN(
    deviceId: string,
    limit: number,
    name?: string,
    tags?: Record<string, string>,
  ): Promise<TelemetryData[]> {
    await this.ensureTableExists(deviceId);
    const tableName = this.getTableName(deviceId);

    let sql = `
    SELECT name, value, unit, description, timestamp, tags
    FROM ${tableName}
    WHERE 1=1
  `;
    const params: unknown[] = [];
    let paramIndex = 1;

    if (name) {
      sql += ` AND name = $${paramIndex}`;
      params.push(name);
      paramIndex++;
    }

    if (tags) {
      for (const [key, value] of Object.entries(tags)) {
        sql += ` AND tags->>'${key}' = $${paramIndex}`;
        params.push(value);
        paramIndex++;
      }
    }

    sql += ` ORDER BY timestamp DESC LIMIT $${paramIndex}`;
    params.push(limit);

    const result = await this.pool.query(sql, params);

    // 🔥 Tek bir dönüşüm fonksiyonu
    return result.rows.map((row) => this.rowToTelemetryData(row, deviceId));
  }

  async listDevices(): Promise<string[]> {
    const result = await this.pool.query(`
      SELECT hypertable_name 
      FROM timescaledb_information.hypertables
      WHERE hypertable_name LIKE 'device_%'
      ORDER BY hypertable_name
    `);
    return result.rows.map((row) => row.hypertable_name.replace("device_", ""));
  }

  async deleteDevice(deviceId: string): Promise<void> {
    const tableName = this.getTableName(deviceId);
    await this.pool.query(`DROP TABLE IF EXISTS ${tableName}`);
    this.tableCache.delete(tableName);
    this.nameUnitCache.delete(deviceId);
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  async health(): Promise<boolean> {
    try {
      await this.pool.query("SELECT 1");
      return true;
    } catch (error) {
      console.error("[TimescaleDB] Health check failed:", error);
      return false;
    }
  }

  private rowToTelemetryData(row: any, deviceId: string): TelemetryData {
    return {
      name: row.name,
      description: row.description ?? "",
      value: row.value,
      unit: row.unit ?? "",
      timestamp: row.timestamp.toISOString(),
      deviceId: deviceId,
      tags: row.tags ?? {},
    } as TelemetryData;
  }

  /**
   * Downsampled veri alır.
   * Zaman aralığını istenen nokta sayısına böler,
   * her dilimin ortalamasını hesaplar.
   *
   * @param options - Downsample seçenekleri
   * @param options.from - Başlangıç zamanı (ISO string veya Date)
   * @param options.to - Bitiş zamanı (ISO string veya Date)
   * @param options.points - İstenen nokta sayısı (varsayılan: 120)
   * @param options.deviceId - Cihaz ID'si (tablo adı olarak kullanılır)
   * @param options.names - Filtrelenecek telemetry isimleri (opsiyonel)
   * @param options.tags - Filtrelenecek tag'ler (opsiyonel)
   * @returns Promise<TelemetryData[]> - Downsampled telemetry verileri
   *
   * @example
   * // Son 1 saat, 120 nokta
   * const data = await adapter.getDownsampledData({
   *   from: new Date(Date.now() - 3600000),
   *   to: new Date(),
   *   points: 120,
   *   deviceId: 'xrack-simulator'
   * });
   *
   * @example
   * // Son 1 gün, sadece Voltage ve Current, 500 nokta
   * const data = await adapter.getDownsampledData({
   *   from: new Date(Date.now() - 86400000),
   *   to: new Date(),
   *   points: 500,
   *   deviceId: 'xrack-simulator',
   *   names: ['Voltage', 'Current']
   * });
   */
  async getDownsampledData(
    options: DownsampleOptions,
  ): Promise<TelemetryData[]> {
    const { from, to, points = 120, deviceId, names, tags } = options;

    await this.ensureTableExists(deviceId);

    const totalSeconds = (to.getTime() - from.getTime()) / 1000;
    const bucketSeconds = Math.max(1, Math.floor(totalSeconds / points));
    const bucketInterval = this.getBucketInterval(bucketSeconds);

    console.log(
      `[TimescaleDB] Downsampling: total=${totalSeconds}s, target=${points}pts, bucket=${bucketInterval}`,
    );

    const { names: availableNames, unitMap } = await this.getOrFetchNamesAndUnits(deviceId, from, to);

    let selectedNames = names;
    if (!selectedNames || selectedNames.length === 0) {
      selectedNames = availableNames;
    }

    if (selectedNames.length === 0) {
      console.warn("[TimescaleDB] No telemetry names found");
      return [];
    }

    // 🔥 DÜZELTİLDİ: Her name için ayrı CASE WHEN kullan
    const avgFields = selectedNames
      .map((name) => {
        return `AVG(CASE WHEN name = '${name}' THEN (value)::numeric END) AS "${name}"`;
      })
      .join(", ");

    const whereConditions = [
      `timestamp >= '${from.toISOString()}'`,
      `timestamp <= '${to.toISOString()}'`,
    ];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (tags) {
      for (const [key, value] of Object.entries(tags)) {
        whereConditions.push(`tags->>'${key}' = $${paramIndex}`);
        params.push(value);
        paramIndex++;
      }
    }

    const tableName = this.getTableName(deviceId);

    const query = `
    SELECT
      time_bucket('${bucketInterval}', timestamp) AS bucket,
      tags,
      ${avgFields}
    FROM ${tableName}
    WHERE ${whereConditions.join(" AND ")}
    GROUP BY bucket, tags
    ORDER BY bucket ASC
  `;

    console.log(`[TimescaleDB] Query: ${query.substring(0, 500)}...`);

    const result = params.length > 0
      ? await this.pool.query(query, params)
      : await this.pool.query(query);

    if (result.rows.length === 0) {
      console.log("[TimescaleDB] No data found in time range");
      return [];
    }

    const telemetries: TelemetryData[] = [];

    for (const row of result.rows) {
      const bucketTimestamp = row.bucket;

      for (const name of selectedNames) {
        const avgValue = row[name];

        if (avgValue !== null && avgValue !== undefined) {
          const unit = unitMap.get(name) ?? "";

          telemetries.push({
            name: name,
            description: `Downsampled (${bucketInterval} buckets) - ${name}`,
            value: parseFloat(parseFloat(avgValue).toFixed(4)),
            unit: unit,
            timestamp: bucketTimestamp,
            deviceId: deviceId,
            tags: row.tags ?? {},
          });
        }
      }
    }

    console.log(
      `[TimescaleDB] Downsampled: ${result.rows.length} buckets → ${telemetries.length} telemetries`,
    );

    return telemetries;
  }

  /**
   * Zaman aralığını TimescaleDB'in anlayacağı interval string'ine çevirir
   *
   * @param seconds - Saniye cinsinden zaman aralığı
   * @returns string - TimescaleDB interval string'i
   *
   * @example
   * getBucketInterval(30)    // returns "30 seconds"
   * getBucketInterval(120)   // returns "2 minutes"
   * getBucketInterval(7200)  // returns "2 hours"
   * getBucketInterval(172800) // returns "2 days"
   */
  private getBucketInterval(seconds: number): string {
    if (seconds < 60) return `${seconds} seconds`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours`;
    return `${Math.floor(seconds / 86400)} days`;
  }

  private async getOrFetchNamesAndUnits(
    deviceId: string,
    from: Date,
    to: Date,
  ): Promise<{ names: string[]; unitMap: Map<string, string> }> {
    const cached = this.nameUnitCache.get(deviceId);
    if (cached) return cached;

    const tableName = this.getTableName(deviceId);

    const query = `
    SELECT DISTINCT name, unit
    FROM ${tableName}
    WHERE timestamp >= '${from.toISOString()}'
      AND timestamp <= '${to.toISOString()}'
    ORDER BY name
  `;

    const result = await this.pool.query(query);
    const names: string[] = [];
    const unitMap = new Map<string, string>();

    for (const row of result.rows) {
      names.push(row.name);
      unitMap.set(row.name, row.unit ?? "");
    }

    const entry = { names, unitMap };
    this.nameUnitCache.set(deviceId, entry);
    return entry;
  }
}
