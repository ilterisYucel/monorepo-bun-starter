import type { ISqlDatabase } from "@gd-monorepo/core";

import { LOG_EVENTS_DDL } from "@gd-monorepo/tamper-logger";

import type { LogEntry, LogQueryParams } from "@gd-monorepo/shared-types";


const CREATE_TABLE = `
  CREATE TABLE IF NOT EXISTS system_logs (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    type        VARCHAR(20) NOT NULL CHECK (type IN ('info', 'success', 'error', 'warning')),
    source      VARCHAR(20) NOT NULL CHECK (source IN ('system', 'user')),
    message     TEXT NOT NULL,
    details     TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON system_logs (timestamp DESC);
  CREATE INDEX IF NOT EXISTS idx_logs_source ON system_logs (source, timestamp DESC);
  CREATE INDEX IF NOT EXISTS idx_logs_type ON system_logs (type, timestamp DESC);
`;

/**
 * UNION sorgusu: system_logs (geçiş — client olayları) ∪ log_events
 * (TamperLogger çıktısı). Kolon isimleri dışta sabittir; filtreler dış
 * sorguya uygulanır.
 */
const UNION_QUERY = `
  SELECT * FROM (
    SELECT id, timestamp, type, source, message, details FROM system_logs
    UNION ALL
    SELECT
      NULL::uuid AS id,
      ts AS timestamp,
      CASE level
        WHEN 'warn' THEN 'warning'
        WHEN 'error' THEN 'error'
        WHEN 'fatal' THEN 'error'
        ELSE 'info'
      END AS type,
      'system' AS source,
      message,
      '[' || category || '/' || event_code || '] ' || coalesce(context::text, '{}') AS details
    FROM log_events
  ) combined
`;

export class LogRepository {
  constructor(private readonly db: ISqlDatabase) {}

  async initialize(): Promise<void> {
    await this.db.execute(CREATE_TABLE);
    await this.db.execute(LOG_EVENTS_DDL);
    // Eski log kayıtlarını temizle (varsayılan: 30 günden eski)
    await this.deleteOlderThan(30);
  }

  /**
   * Belirtilen gün sayısından eski log kayıtlarını siler.
   * Disk büyümesini kontrol altında tutmak için startup'ta ve
   * periyodik olarak çağrılmalıdır.
   *
   * system_logs tablosu hypertable olmadığı için retention politikası
   * uygulanamaz — manuel DELETE gereklidir.
   */
  async deleteOlderThan(days: number): Promise<void> {
    try {
      await this.db.execute(
        `DELETE FROM system_logs WHERE timestamp < NOW() - INTERVAL '${days} days'`,
      );
      console.log(
        `[LogRepository] ${days} gunden eski loglar temizlendi.`,
      );
    } catch (err) {
      console.error("[LogRepository] Log temizleme basarisiz:", err);
    }
  }

  async insert(entry: Omit<LogEntry, "id" | "timestamp">): Promise<LogEntry> {
    const row = await this.db.queryOne<LogEntry>(
      `INSERT INTO system_logs (type, source, message, details)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [entry.type, entry.source, entry.message, entry.details ?? null],
    );
    return row!;
  }

  async query(params: LogQueryParams): Promise<LogEntry[]> {
    const conditions: string[] = [];
    const values: unknown[] = [];
    let i = 1;

    if (params.sources && params.sources.length > 0) {
      conditions.push(`source = ANY($${i++}::varchar[])`);
      values.push(params.sources);
    }
    if (params.types && params.types.length > 0) {
      conditions.push(`type = ANY($${i++}::varchar[])`);
      values.push(params.types);
    }
    if (params.from) {
      conditions.push(`timestamp >= $${i++}`);
      values.push(params.from);
    }
    if (params.to) {
      conditions.push(`timestamp <= $${i++}`);
      values.push(params.to);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const limit = params.limit ?? 200;
    const offset = params.offset ?? 0;

    return this.db.query<LogEntry>(
      `${UNION_QUERY} ${where} ORDER BY timestamp DESC LIMIT $${i++} OFFSET $${i++}`,
      [...values, limit, offset],
    );
  }
}
