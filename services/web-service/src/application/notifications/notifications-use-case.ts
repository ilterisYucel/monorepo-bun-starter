import type { INotificationReader } from "../../domain/ports/event-feed";

/** Bildirim DTO'su — boss UI sözleşmesi (şekil DEĞİŞMEZ). */
export interface NotificationDto {
  fieldId: string;
  fieldName: string;
  eventId: string;
  eventCode: string;
  level: string;
  category: string;
  message: string;
  context: Record<string, string>;
  occurredAt: string;
}

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;

/**
 * NotificationsUseCase — boss bildirim okuma (UC-4).
 *
 * - `list`: limit 1..500 (varsayılan 100), `after` son görülme sınırı.
 * - `countSince`: rozet sayacı.
 */
export class NotificationsUseCase {
  constructor(private readonly reader: INotificationReader) {}

  async list(input: { limit?: number; after?: string }): Promise<NotificationDto[]> {
    const parsed = Number(input.limit ?? DEFAULT_LIMIT);
    const limit =
      Number.isFinite(parsed) && parsed > 0
        ? Math.min(Math.floor(parsed), MAX_LIMIT)
        : DEFAULT_LIMIT;
    const rows = await this.reader.list({
      limit,
      ...(input.after !== undefined && input.after.length > 0
        ? { after: input.after }
        : {}),
    });
    return rows.map((row) => ({
      fieldId: row.fieldId,
      fieldName: row.fieldName ?? row.fieldId,
      eventId: row.eventId,
      eventCode: row.eventCode,
      level: row.level,
      category: row.category,
      message: row.message,
      context: row.context,
      occurredAt: new Date(row.occurredAt).toISOString(),
    }));
  }

  countSince(since: string): Promise<number> {
    return this.reader.countSince(since);
  }
}
