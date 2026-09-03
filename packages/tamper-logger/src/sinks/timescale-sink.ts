import type { LogEvent } from "../types";
import type { ILogSink } from "../interfaces";

/** Sink'in ihtiyaç duyduğu en dar SQL sözleşmesi — ISqlDatabase bunu karşılar. */
export interface SqlExecutor {
  execute(sql: string, params?: unknown[]): Promise<void>;
}

/** TimescaleSink yapılandırması — tek obje (DI kuralı 3). */
export interface TimescaleSinkConfig {
  readonly executor: SqlExecutor;
  readonly table?: string;
}

const COLUMN_COUNT = 12;

/**
 * `log_events` tablosu DDL — servis init'inde çalıştırılır (T0.11).
 * TimescaleSink bu tabloya yazar; hypertable dönüşümü migrasyonla yapılır.
 */
export const LOG_EVENTS_DDL = `
CREATE TABLE IF NOT EXISTS log_events (
  ts             TIMESTAMPTZ NOT NULL,
  level          TEXT NOT NULL,
  category       TEXT NOT NULL,
  event_code     TEXT NOT NULL,
  message        TEXT NOT NULL,
  context        JSONB DEFAULT '{}',
  correlation_id TEXT,
  service        TEXT,
  host           TEXT,
  seq            BIGINT NOT NULL,
  prev_hash      TEXT NOT NULL,
  signature      TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_log_events_ts ON log_events (ts DESC);
CREATE INDEX IF NOT EXISTS idx_log_events_corr ON log_events (correlation_id);
`;

/**
 * TimescaleSink — `log_events` hypertable'ına çok satırlı tek INSERT
 * (unnest) yazar. Executor hatası yukarı fırlatılır — fail-closed'u tetikler.
 * Bağlantı yaşam döngüsü executor sahibine aittir.
 */
export class TimescaleSink implements ILogSink {
  private readonly table: string;

  constructor(private readonly config: TimescaleSinkConfig) {
    this.table = config.table ?? "log_events";
  }

  name(): string {
    return "timescale";
  }

  async write(events: LogEvent[]): Promise<void> {
    if (events.length === 0) return;
    const arrays: unknown[][] = Array.from(
      { length: COLUMN_COUNT },
      () => [],
    );
    for (const event of events) {
      arrays[0].push(event.ts);
      arrays[1].push(event.level);
      arrays[2].push(event.category);
      arrays[3].push(event.eventCode);
      arrays[4].push(event.message);
      arrays[5].push(JSON.stringify(event.context ?? {}));
      arrays[6].push(event.correlationId ?? null);
      arrays[7].push(event.service ?? null);
      arrays[8].push(event.host ?? null);
      arrays[9].push(event.seq);
      arrays[10].push(event.prevHash);
      arrays[11].push(event.signature);
    }
    const sql =
      `INSERT INTO ${this.table} ` +
      "(ts, level, category, event_code, message, context, correlation_id, " +
      "service, host, seq, prev_hash, signature) " +
      "SELECT * FROM unnest(" +
      "$1::timestamptz[], $2::text[], $3::text[], $4::text[], $5::text[], " +
      "$6::jsonb[], $7::text[], $8::text[], $9::text[], $10::bigint[], " +
      "$11::text[], $12::text[])";
    await this.config.executor.execute(sql, arrays);
  }

  async close(): Promise<void> {}
}
