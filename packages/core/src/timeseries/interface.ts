// packages/core/src/timeseries/ITimeseriesDatabase.ts

import type { TelemetryData } from "@gd-monorepo/shared-types";

export interface TimeSeriesQuery {
  deviceId?: string;
  names?: string[]; // "Voltage", "Current", "SoC" (opsiyonel)
  from: Date;
  to: Date;
  tags?: Record<string, string>;
  limit?: number;
  order?: "ASC" | "DESC";
}

export interface AggregateQuery extends TimeSeriesQuery {
  aggregateFn: "AVG" | "MAX" | "MIN" | "SUM" | "COUNT";
  interval: string; // '1 minute', '5 minutes', '1 hour'
}

export interface DownsampleOptions {
  from: Date;
  to: Date;
  points?: number; // İstenen nokta sayısı (varsayılan: 100)
  deviceId: string;
  names?: string[];
  tags?: Record<string, string>;
}

export interface ITimeseriesDatabase {
  /**
   * TelemetryData yazar (direkt)
   */
  write(telemetries: TelemetryData | TelemetryData[]): Promise<void>;

  /**
   * Ham veri sorgular (TelemetryData döner)
   */
  query(query: TimeSeriesQuery): Promise<TelemetryData[]>;

  /**
   * Aggregate sorgu (ortalama, max, min, vs.)
   */
  aggregate(query: AggregateQuery): Promise<{ bucket: Date; value: number }[]>;

  getDownsampledData(options: DownsampleOptions): Promise<TelemetryData[]>;

  /**
   * Son değeri getir
   */
  getLatest(
    deviceId: string,
    name?: string,
    tags?: Record<string, string>,
  ): Promise<TelemetryData | null>;

  /**
   * Son N değeri getir
   */
  getLatestN(
    deviceId: string,
    limit: number,
    name?: string,
    tags?: Record<string, string>,
  ): Promise<TelemetryData[]>;

  /**
   * Ham SQL çalıştır (DDL, maintenance işlemleri için)
   */
  executeRaw(sql: string, params?: unknown[]): Promise<unknown>;

  /**
   * Bağlantıyı kapat
   */
  close(): Promise<void>;

  /**
   * Sağlık kontrolü
   */
  health(): Promise<boolean>;
}
