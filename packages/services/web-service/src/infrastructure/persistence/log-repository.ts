import type { ISqlDatabase } from "@gd-monorepo/core";
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

export class LogRepository {
  constructor(private readonly db: ISqlDatabase) {}

  async initialize(): Promise<void> {
    await this.db.execute(CREATE_TABLE);
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
      `SELECT * FROM system_logs ${where} ORDER BY timestamp DESC LIMIT $${i++} OFFSET $${i++}`,
      [...values, limit, offset],
    );
  }
}
