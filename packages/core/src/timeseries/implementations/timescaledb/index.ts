// TimescaleDB implementasyonu — ITimeseriesDatabase kontratının somut karşılığı.
// MaterializedViewManager bu implementasyona özgüdür (PG materialized view'lar);
// başka bir backend'de karşılığı continuous aggregate'lardır.

export { TimescaleDBAdapter } from "./timescaledb-adapter";
export type { TimescaleDBConfig } from "./timescaledb-adapter";
export { buildTimescaleDBConfig } from "./timescaledb-config";
export { MaterializedViewManager } from "./materialized-view-manager";
export type {
  MaterializedInterval,
  TimeRange,
  MvOptions,
} from "./materialized-view-manager";
