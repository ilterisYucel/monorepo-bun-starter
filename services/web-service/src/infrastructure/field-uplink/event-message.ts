/**
 * Field→boss olay DTO'su — field `GET /api/events` yanıtı ve boss toplayıcı
 * sözleşmesi (SPEC UC-5). Wire frame DEĞİLDİR: olaylar HTTP pull ile taşınır.
 *
 * `eventId = <fieldId>:<correlation_id|seq>` — (field_id, event_id) dedupe
 * anahtarıdır; yeniden başlatmalarda çakışmaz.
 */
export interface EventMessage {
  eventId: string;
  timestamp: string;
  level: "info" | "warn" | "error";
  category: "app" | "security";
  eventCode: string;
  message: string;
  context?: Record<string, string>;
}
