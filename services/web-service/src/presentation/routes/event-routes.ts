// Field tier: boss olay toplama ucu — log_events whitelist'li delta (SPEC UC-5).
// Olaylar artık WS push ile değil, boss'un bu ucu poll etmesiyle taşınır.

import type { FastifyInstance } from "fastify";
import type { ISqlDatabase } from "@gd-monorepo/core";
import type { EventMessage } from "../../infrastructure/field-uplink/event-message";
import { authorizeCommand } from "./internal-authorize";

/**
 * Boss'a aktarılacak olay whitelist'i (BOSS-UYGULAMA-MIMARISI.md §7.6):
 * cihaz alarm geçişleri + oturum audit'i + operasyon koşusu geçişleri.
 * Tüm log akışı GÜRÜLTÜ olur — yalnızca patronun kararında değer taşıyan
 * geçişler aktarılır.
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

interface LogEventRow {
  ts: Date | string;
  level: string;
  category: string;
  event_code: string;
  message: string;
  context: unknown;
  seq: number | string;
  correlation_id: string | null;
}

export interface EventRoutesDeps {
  sql: ISqlDatabase;
  /** Saha kimliği — eventId öneki (`<fieldId>:<correlation|seq>`). */
  fieldId: string;
  /** Programatik kanal gizli token'ı (yoksa iç yol kapalı — fail-closed). */
  internalToken?: string;
}

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

function toEvent(fieldId: string, row: LogEventRow): EventMessage {
  const context = stringifyContext(row.context);
  return {
    eventId: `${fieldId}:${row.correlation_id ?? row.seq}`,
    timestamp: new Date(row.ts).toISOString(),
    level:
      row.level === "error" ? "error" : row.level === "warn" ? "warn" : "info",
    category: row.category === "security" ? "security" : "app",
    eventCode: row.event_code,
    message: row.message,
    ...(context !== undefined ? { context } : {}),
  };
}

/**
 * eventRoutes — `GET /api/events?after=<ISO>&limit=<n>`.
 *
 * Sözleşme (test: event-routes.test.ts):
 * - Yetki: admin/teknik (Bearer) veya iç token; yoksa 403 (fail-closed).
 * - `after` yoksa epoch; geçersizse 400. Limit 1..1000 (varsayılan 200).
 * - Yalnız whitelist'li `log_events` satırları, `ts` ARTAN sırada döner.
 * - Yanıt: `{ events: EventMessage[] }` — `eventId = <fieldId>:<corr|seq>`.
 */
export async function eventRoutes(
  fastify: FastifyInstance,
  deps: EventRoutesDeps,
): Promise<void> {
  fastify.get("/events", async (request, reply) => {
    if (!authorizeCommand(request, deps.internalToken)) {
      return reply.status(403).send({ error: "Bu islem icin yetkiniz yok" });
    }

    const query = (request.query ?? {}) as {
      after?: string | string[];
      limit?: string | string[];
    };
    const afterRaw = Array.isArray(query.after) ? query.after[0] : query.after;
    const limitRaw = Array.isArray(query.limit) ? query.limit[0] : query.limit;

    let afterMs = 0;
    if (afterRaw !== undefined && afterRaw.length > 0) {
      afterMs = new Date(afterRaw).getTime();
      if (!Number.isFinite(afterMs)) {
        return reply.status(400).send({ error: "invalid_after" });
      }
    }

    const parsedLimit = Number(limitRaw ?? DEFAULT_LIMIT);
    const limit = Number.isFinite(parsedLimit)
      ? Math.min(MAX_LIMIT, Math.max(1, Math.trunc(parsedLimit)))
      : DEFAULT_LIMIT;

    const rows = await deps.sql.query<LogEventRow>(
      `SELECT ts, level, category, event_code, message, context, seq, correlation_id
       FROM log_events
       WHERE ts > $1 AND event_code = ANY($2::text[])
       ORDER BY ts ASC
       LIMIT $3`,
      [
        new Date(afterMs).toISOString(),
        UPLINK_EVENT_WHITELIST as unknown as string[],
        limit,
      ],
    );

    return reply.send({
      events: rows.map((row) => toEvent(deps.fieldId, row)),
    });
  });
}
