import type { ITimeseriesDatabase } from "./interface";

export interface MaterializedInterval {
  name: string;
  bucket: string;
  startOffset: string;
  endOffset: string;
  scheduleInterval: string;
  compressAfter?: string;
}

export interface TimeRange {
  from: Date;
  to: Date;
}

export interface MvOptions {
  intervals?: MaterializedInterval[];
}

const DEFAULT_INTERVALS: MaterializedInterval[] = [
  {
    name: "5s",
    bucket: "5 seconds",
    startOffset: "10 seconds",
    endOffset: "1 second",
    scheduleInterval: "5 seconds",
  },
  {
    name: "1m",
    bucket: "1 minute",
    startOffset: "2 minutes",
    endOffset: "1 second",
    scheduleInterval: "30 seconds",
    compressAfter: "7 days",
  },
  {
    name: "15m",
    bucket: "15 minutes",
    startOffset: "30 minutes",
    endOffset: "1 minute",
    scheduleInterval: "5 minutes",
    compressAfter: "30 days",
  },
  {
    name: "1h",
    bucket: "1 hour",
    startOffset: "2 hours",
    endOffset: "1 minute",
    scheduleInterval: "15 minutes",
    compressAfter: "90 days",
  },
  {
    name: "1d",
    bucket: "1 day",
    startOffset: "2 days",
    endOffset: "1 hour",
    scheduleInterval: "1 hour",
    compressAfter: "365 days",
  },
];

export class MaterializedViewManager {
  private viewCache: Set<string> = new Set();

  constructor(
    private readonly db: ITimeseriesDatabase,
  ) {}

  async createMaterializedViews(
    hypertableName: string,
    options?: MvOptions,
  ): Promise<void> {
    const intervals = options?.intervals ?? DEFAULT_INTERVALS;

    for (const interval of intervals) {
      await this.createSingleMV(hypertableName, interval);
    }
  }

  private getViewName(
    hypertable: string,
    interval: MaterializedInterval,
  ): string {
    return `${hypertable}_${interval.name}`;
  }

  private async createSingleMV(
    hypertable: string,
    interval: MaterializedInterval,
  ): Promise<void> {
    const viewName = this.getViewName(hypertable, interval);

    if (this.viewCache.has(viewName)) return;

    await this.db.executeRaw(`
      CREATE MATERIALIZED VIEW IF NOT EXISTS ${viewName}
      WITH (timescaledb.continuous) AS
      SELECT
        time_bucket('${interval.bucket}', timestamp) AS bucket,
        name,
        AVG(value) AS avg_value,
        MIN(value) AS min_value,
        MAX(value) AS max_value,
        LAST(value, timestamp) AS last_value,
        COUNT(*) AS sample_count,
        STDDEV(value) AS stddev_value
      FROM ${hypertable}
      GROUP BY bucket, name
    `);

    await this.db.executeRaw(`
      SELECT add_continuous_aggregate_policy('${viewName}',
        start_offset => INTERVAL '${interval.startOffset}',
        end_offset => INTERVAL '${interval.endOffset}',
        schedule_interval => INTERVAL '${interval.scheduleInterval}',
        if_not_exists => TRUE
      )
    `);

    if (interval.compressAfter) {
      await this.db.executeRaw(`
        SELECT add_compression_policy('${viewName}',
          INTERVAL '${interval.compressAfter}',
          if_not_exists => TRUE
        )
      `);
    }

    this.viewCache.add(viewName);
    console.log(
      `[MaterializedViewManager] MV olusturuldu: ${viewName} (bucket: ${interval.bucket})`,
    );
  }

  selectView(
    hypertable: string,
    timeRange: TimeRange,
  ): string {
    const diffSeconds =
      (timeRange.to.getTime() - timeRange.from.getTime()) / 1000;

    if (diffSeconds <= 300) return hypertable;
    if (diffSeconds <= 3600) return `${hypertable}_5s`;
    if (diffSeconds <= 86400) return `${hypertable}_1m`;
    if (diffSeconds <= 604800) return `${hypertable}_15m`;
    return `${hypertable}_1h`;
  }

  async ensureMaterializedViews(hypertableName: string): Promise<void> {
    await this.createMaterializedViews(hypertableName);
  }

  async dropMaterializedViews(hypertableName: string): Promise<void> {
    const intervals = DEFAULT_INTERVALS;

    for (const interval of intervals) {
      const viewName = this.getViewName(hypertableName, interval);

      try {
        await this.db.executeRaw(`DROP MATERIALIZED VIEW IF EXISTS ${viewName}`);
        this.viewCache.delete(viewName);
        console.log(`[MaterializedViewManager] MV silindi: ${viewName}`);
      } catch (error) {
        console.warn(
          `[MaterializedViewManager] MV silinirken hata: ${viewName}`,
          error,
        );
      }
    }
  }

  async existingViews(): Promise<string[]> {
    const result = await this.db.executeRaw(`
      SELECT view_name
      FROM timescaledb_information.continuous_aggregates
      ORDER BY view_name
    `) as { rows: { view_name: string }[] };

    if (!result?.rows) return [];
    return result.rows.map((row) => row.view_name);
  }

  getDefaultIntervals(): MaterializedInterval[] {
    return [...DEFAULT_INTERVALS];
  }
}
