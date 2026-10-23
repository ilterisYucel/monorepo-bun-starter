import type { ISqlDatabase } from "@gd-monorepo/core";
import type {
  EventFeedQuery,
  FieldEventRow,
  IEventFeedPort,
} from "../../domain/ports/event-feed";

interface DbRow {
  ts: Date | string;
  level: string;
  category: string;
  event_code: string;
  message: string;
  context: unknown;
  seq: number | string;
  correlation_id: string | null;
}

/** LogEventFeed — `IEventFeedPort`'un Postgres adaptörü (field tier). */
export class LogEventFeed implements IEventFeedPort {
  constructor(private readonly sql: ISqlDatabase) {}

  async listAfter(query: EventFeedQuery): Promise<FieldEventRow[]> {
    const rows = await this.sql.query<DbRow>(
      `SELECT ts, level, category, event_code, message, context, seq, correlation_id
       FROM log_events
       WHERE ts > $1 AND event_code = ANY($2::text[])
       ORDER BY ts ASC
       LIMIT $3`,
      [query.after, query.eventCodes as unknown as string[], query.limit],
    );
    return rows.map((row) => ({
      ts: row.ts,
      level: row.level,
      category: row.category,
      eventCode: row.event_code,
      message: row.message,
      context: row.context,
      seq: row.seq,
      correlationId: row.correlation_id,
    }));
  }
}
