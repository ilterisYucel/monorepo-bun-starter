import type { ISqlDatabase } from "@gd-monorepo/core";
import type {
  INotificationReader,
  NotificationRow,
} from "../../../domain/ports/event-feed";

interface DbRow {
  field_id: string;
  field_name: string | null;
  event_id: string;
  event_code: string;
  level: string;
  category: string;
  message: string;
  context: Record<string, string>;
  occurred_at: Date | string;
}

/** FieldEventReader — `INotificationReader`'ın Postgres adaptörü (boss tier). */
export class FieldEventReader implements INotificationReader {
  constructor(private readonly sql: ISqlDatabase) {}

  async list(input: {
    limit?: number;
    after?: string;
  }): Promise<NotificationRow[]> {
    const rows = await this.sql.query<DbRow>(
      `SELECT fe.*, f.name AS field_name
       FROM field_events fe
       LEFT JOIN admin_fields f ON f.id::text = fe.field_id
       WHERE ($1::timestamptz IS NULL OR fe.received_at > $1)
       ORDER BY fe.received_at DESC
       LIMIT $2`,
      [input.after ?? null, input.limit ?? 100],
    );
    return rows.map((row) => ({
      fieldId: row.field_id,
      fieldName: row.field_name,
      eventId: row.event_id,
      eventCode: row.event_code,
      level: row.level,
      category: row.category,
      message: row.message,
      context: row.context,
      occurredAt: row.occurred_at,
    }));
  }

  async countSince(after: string): Promise<number> {
    const rows = await this.sql.query<{ n: number }>(
      `SELECT COUNT(*)::bigint AS n FROM field_events WHERE received_at > $1`,
      [after],
    );
    return Number(rows[0]?.n ?? 0);
  }
}
