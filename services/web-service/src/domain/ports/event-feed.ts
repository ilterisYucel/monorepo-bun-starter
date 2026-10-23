/**
 * Olay feed'i ve bildirim okuma portları (domain) — SPEC WEB-SERVICE-KATMANLAMA UC-4.
 *
 * - `IEventFeedPort`: field tier'ın boss'a sunduğu log_events deltası.
 * - `INotificationReader`: boss tier'ın topladığı olayları okuması.
 * SQL/DB ayrıntısı adaptörlerde (infrastructure) yaşar.
 */

/** log_events satırı (field tarafı). */
export interface FieldEventRow {
  ts: Date | string;
  level: string;
  category: string;
  eventCode: string;
  message: string;
  context: unknown;
  seq: number | string;
  correlationId: string | null;
}

export interface EventFeedQuery {
  /** ISO başlangıç (bu zamandan SONRA). */
  after: string;
  limit: number;
  /** Aktarılacak olay kodları (whitelist). */
  eventCodes: readonly string[];
}

export interface IEventFeedPort {
  listAfter(query: EventFeedQuery): Promise<FieldEventRow[]>;
}

/** field_events satırı (boss tarafı; admin_fields JOIN alanı dahil). */
export interface NotificationRow {
  fieldId: string;
  fieldName: string | null;
  eventId: string;
  eventCode: string;
  level: string;
  category: string;
  message: string;
  context: Record<string, string>;
  occurredAt: Date | string;
}

export interface INotificationReader {
  list(input: { limit?: number; after?: string }): Promise<NotificationRow[]>;
  countSince(after: string): Promise<number>;
}
