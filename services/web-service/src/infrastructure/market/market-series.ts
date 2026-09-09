import type { ISqlDatabase } from "@gd-monorepo/core";

/** Piyasa seri noktası — dış seri deposundan (`external_series`) okunur. */
export interface MarketSeriesPoint {
  timestamp: string;
  value: number;
  unit: string;
}

/** Seri anahtarı — `external_series` (source, series) ikilisi. */
export interface MarketSeriesKey {
  source: string;
  series: string;
}

/**
 * Boss piyasa ekranının EPİAŞ seri anahtarları (BOSS-UYGULAMA-MIMARISI.md §7.3).
 * Değerler, integration-service'teki `epias-market-prices.json` seri eşlemesiyle
 * birebir olmalıdır; deployment config'i farklı isim kullanırsa bu sabitler
 * o config'e eşlenir (seriler config-tanımlıdır — kod enum'u YOKTUR).
 */
export const MARKET_SERIES = {
  ptf: { source: "epias", series: "ptf" },
  gipWeightedAverage: { source: "epias", series: "gip_wap" },
} as const satisfies Record<string, MarketSeriesKey>;

interface SeriesRow {
  timestamp: Date | string;
  value: number;
  unit: string;
}

/**
 * MarketSeries — dış seri deposu okuyucusu (sorgular).
 * Boss tier'da `external_series` tablosunu okur (integration-service yazar —
 * aynı TimescaleDB, boss compose).
 */
export class MarketSeries {
  constructor(private readonly sql: ISqlDatabase) {}

  /** Zaman aralığındaki seri noktaları (sorgu — kronolojik). */
  async points(
    key: MarketSeriesKey,
    from: string,
    to: string,
  ): Promise<MarketSeriesPoint[]> {
    const rows = await this.sql.query<SeriesRow>(
      `SELECT timestamp, value, unit
       FROM external_series
       WHERE source = $1 AND series = $2 AND timestamp >= $3 AND timestamp <= $4
       ORDER BY timestamp ASC`,
      [key.source, key.series, from, to],
    );
    return rows.map((row) => ({
      timestamp: new Date(row.timestamp).toISOString(),
      value: row.value,
      unit: row.unit,
    }));
  }

  /** Serinin en güncel noktası (sorgu) — yoksa undefined. */
  async latest(key: MarketSeriesKey): Promise<MarketSeriesPoint | undefined> {
    const rows = await this.sql.query<SeriesRow>(
      `SELECT timestamp, value, unit
       FROM external_series
       WHERE source = $1 AND series = $2
       ORDER BY timestamp DESC
       LIMIT 1`,
      [key.source, key.series],
    );
    const row = rows[0];
    if (!row) return undefined;
    return {
      timestamp: new Date(row.timestamp).toISOString(),
      value: row.value,
      unit: row.unit,
    };
  }

  /** Aralıktaki ortalama değer (sorgu) — nokta yoksa undefined. */
  async average(
    key: MarketSeriesKey,
    from: string,
    to: string,
  ): Promise<number | undefined> {
    const rows = await this.sql.query<{ avg: number | null }>(
      `SELECT AVG(value)::double precision AS avg
       FROM external_series
       WHERE source = $1 AND series = $2 AND timestamp >= $3 AND timestamp <= $4`,
      [key.source, key.series, from, to],
    );
    const value = rows[0]?.avg;
    return value === null || value === undefined ? undefined : value;
  }
}
