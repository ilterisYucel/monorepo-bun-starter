import type {
  FieldEventRow,
  IEventFeedPort,
} from "../../domain/ports/event-feed";
import type { FieldEventDto } from "./event-dto";

/**
 * Boss'a aktarılacak olay whitelist'i (BOSS-UYGULAMA-MIMARISI.md §7.6):
 * cihaz alarm geçişleri + oturum audit'i + operasyon koşusu geçişleri.
 */
export const UPLINK_EVENT_WHITELIST = [
  "device_alarm",
  "device_alarm_cleared",
  "alarm_resolved",
  "session_open",
  "session_end",
  "operation_started",
  "operation_completed",
  "operation_failed",
  "operation_rolled_back",
] as const;

const DEFAULT_LIMIT = 200;
const MAX_LIMIT = 1000;

function stringifyContext(
  context: unknown,
): Record<string, string> | undefined {
  if (typeof context !== "object" || context === null) return undefined;
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(
    context as Record<string, unknown>,
  )) {
    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      out[key] = String(value);
    }
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function toDto(fieldId: string, row: FieldEventRow): FieldEventDto {
  const context = stringifyContext(row.context);
  return {
    eventId: `${fieldId}:${row.correlationId ?? row.seq}`,
    timestamp: new Date(row.ts).toISOString(),
    level:
      row.level === "error" ? "error" : row.level === "warn" ? "warn" : "info",
    category: row.category === "security" ? "security" : "app",
    eventCode: row.eventCode,
    message: row.message,
    ...(context !== undefined ? { context } : {}),
  };
}

/**
 * ListFieldEventsUseCase — field olay feed'i (UC-4).
 *
 * Sözleşme:
 * - Yalnız whitelist'li olaylar istenir; `ts` ARTAN sırada döner.
 * - `after` yoksa epoch; limit 1..1000 (varsayılan 200).
 * - Yanıt DTO'su `eventId = <fieldId>:<corr|seq>` taşır.
 */
export class ListFieldEventsUseCase {
  constructor(
    private readonly feed: IEventFeedPort,
    private readonly fieldId: string,
  ) {}

  async execute(input: { after?: string; limit?: number }): Promise<FieldEventDto[]> {
    const parsedLimit = Number(input.limit ?? DEFAULT_LIMIT);
    const limit = Number.isFinite(parsedLimit)
      ? Math.min(MAX_LIMIT, Math.max(1, Math.trunc(parsedLimit)))
      : DEFAULT_LIMIT;
    const after =
      input.after !== undefined && input.after.length > 0
        ? new Date(input.after).toISOString()
        : new Date(0).toISOString();

    const rows = await this.feed.listAfter({
      after,
      limit,
      eventCodes: UPLINK_EVENT_WHITELIST,
    });
    return rows.map((row) => toDto(this.fieldId, row));
  }
}
