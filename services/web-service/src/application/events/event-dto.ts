/**
 * Field→boss olay DTO'su (UC-4/UC-5) — HTTP sözleşmesi.
 * `eventId = <fieldId>:<correlationId|seq>` (dedupe anahtarı).
 */
export interface FieldEventDto {
  eventId: string;
  timestamp: string;
  level: "info" | "warn" | "error";
  category: "app" | "security";
  eventCode: string;
  message: string;
  context?: Record<string, string>;
}
