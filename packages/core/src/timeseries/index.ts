// Timeseries katmanı:
// - Kontrat (interface.ts) — ITimeseriesDatabase + sorgu tipleri
// - Implementasyonlar (implementations/) — timescaledb (aktif), influxdb (ileride)
// Dışarıya barrel üzerinden aynı isimlerle açılır; tüketiciler kontrata bağlanmalıdır.

export type {
  ITimeseriesDatabase,
  TimeSeriesQuery,
  AggregateQuery,
  DownsampleOptions,
} from "./interface";
export {
  TimescaleDBAdapter,
  MaterializedViewManager,
  buildTimescaleDBConfig,
} from "./implementations/timescaledb";
export type {
  TimescaleDBConfig,
  MaterializedInterval,
  TimeRange,
  MvOptions,
} from "./implementations/timescaledb";
