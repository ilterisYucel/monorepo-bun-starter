import type { ISqlDatabase } from "@gd-monorepo/core";
import type { MarketDataPoint } from "@gd-monorepo/shared-types";

const CREATE_TABLE = `
  CREATE TABLE IF NOT EXISTS external_series (
    source    VARCHAR(50)  NOT NULL,
    series    VARCHAR(100) NOT NULL,
    timestamp TIMESTAMPTZ  NOT NULL,
    value     DOUBLE PRECISION NOT NULL,
    unit      VARCHAR(20)  NOT NULL DEFAULT '',
    tags      JSONB DEFAULT '{}',
    PRIMARY KEY (source, series, timestamp)
  );
`;

const CREATE_HYPERTABLE = `
  SELECT create_hypertable('external_series', 'timestamp', if_not_exists => TRUE);
`;

const CREATE_INDEX = `
  CREATE INDEX IF NOT EXISTS idx_external_series_source_series
  ON external_series (source, series, timestamp DESC);
`;

interface SeriesRow {
  source: string;
  series: string;
  timestamp: Date | string;
  value: number;
  unit: string;
  tags: unknown;
}

/**
 * Dis kaynak verilerinin (piyasa fiyatlari vb.) TimescaleDB yazicisi.
 * Storage servis core'undadir — pluginler sadece fetch edip normalize eder.
 */
export class ExternalSeriesWriter {
  constructor(private readonly sql: ISqlDatabase) {}

  /** Komut — tablo/hypertable/index hazirlar. */
  async init(): Promise<void> {
    await this.sql.execute(CREATE_TABLE);
    try {
      await this.sql.execute(CREATE_HYPERTABLE);
    } catch (err) {
      console.warn(
        `[ExternalSeriesWriter] create_hypertable basarisiz (TimescaleDB uzantisi yok olabilir): ${String(err)}`,
      );
    }
    await this.sql.execute(CREATE_INDEX);
  }

  /** Komut — noktalari upsert ile yazar. */
  async write(points: MarketDataPoint[]): Promise<void> {
    if (points.length === 0) {
      return;
    }
    const values = points
      .map((_, i) => {
        const base = i * 6;
        return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}::jsonb)`;
      })
      .join(", ");
    const params = points.flatMap((p) => [
      p.source,
      p.series,
      p.timestamp,
      p.value,
      p.unit,
      JSON.stringify(p.tags ?? {}),
    ]);

    await this.sql.execute(
      `INSERT INTO external_series (source, series, timestamp, value, unit, tags)
       VALUES ${values}
       ON CONFLICT (source, series, timestamp)
       DO UPDATE SET value = EXCLUDED.value, unit = EXCLUDED.unit, tags = EXCLUDED.tags`,
      params,
    );
  }

  /** Sorgu — zaman araligindaki noktalari dondurur. */
  async query(
    source: string,
    series: string,
    from: string,
    to: string,
  ): Promise<MarketDataPoint[]> {
    const rows = await this.sql.query<SeriesRow>(
      `SELECT source, series, timestamp, value, unit, tags
       FROM external_series
       WHERE source = $1 AND series = $2 AND timestamp >= $3 AND timestamp <= $4
       ORDER BY timestamp ASC`,
      [source, series, from, to],
    );
    return rows.map((row) => ({
      source: row.source,
      series: row.series,
      timestamp: new Date(row.timestamp).toISOString(),
      value: row.value,
      unit: row.unit,
      tags: (typeof row.tags === "object" && row.tags !== null
        ? row.tags
        : {}) as Record<string, string>,
    }));
  }

  /** Komut — veritabani baglantisini kapatir. */
  async close(): Promise<void> {
    await this.sql.disconnect();
  }

  /** Sorgu — veritabani saglik durumu. */
  async health(): Promise<boolean> {
    return this.sql.health();
  }
}
