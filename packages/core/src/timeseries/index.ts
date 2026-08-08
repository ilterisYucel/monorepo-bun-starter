export type {
  ITimeseriesDatabase,
  TimeSeriesQuery,
  AggregateQuery,
  DownsampleOptions,
} from "./interface";
export { TimescaleDBAdapter } from "./timescaledb-adapter";
export type { TimescaleDBConfig } from "./timescaledb-adapter";
export { buildTimescaleDBConfig } from "./config";
export { MaterializedViewManager } from "./materialized-view-manager";
export type {
  MaterializedInterval,
  TimeRange,
  MvOptions,
} from "./materialized-view-manager";
