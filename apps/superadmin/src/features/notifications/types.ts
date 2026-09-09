/** Boss bildirim sözleşmesi — backend `/api/notifications` DTO'ları. */
export interface FieldNotification {
  fieldId: string;
  fieldName: string;
  eventId: string;
  eventCode: string;
  level: "info" | "warn" | "error";
  category: "app" | "security";
  message: string;
  context: Record<string, string>;
  occurredAt: string;
}
