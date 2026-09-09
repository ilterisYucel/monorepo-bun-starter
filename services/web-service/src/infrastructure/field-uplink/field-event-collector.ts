import type { ISqlDatabase } from "@gd-monorepo/core";
import type { ILogger } from "@gd-monorepo/ws-tunnel";
import type { EventMessage } from "@gd-monorepo/ws-tunnel";
import type { FieldRegistry } from "./field-registry";

const DDL = `
  CREATE TABLE IF NOT EXISTS field_events (
    id          BIGSERIAL PRIMARY KEY,
    field_id    TEXT NOT NULL,
    event_id    TEXT NOT NULL,
    event_code  TEXT NOT NULL,
    level       TEXT NOT NULL,
    category    TEXT NOT NULL,
    message     TEXT NOT NULL,
    context     JSONB DEFAULT '{}',
    occurred_at TIMESTAMPTZ NOT NULL,
    received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (field_id, event_id)
  );
  CREATE INDEX IF NOT EXISTS idx_field_events_occurred
    ON field_events (occurred_at DESC);
`;

/** Aktarım whitelist'i — field UPLINK_EVENT_WHITELIST ile birebir. */
export const COLLECTED_EVENT_CODES = [
  "device_alarm",
  "device_alarm_cleared",
  "alarm_resolved",
  "session_open",
  "session_end",
] as const;

export interface FieldEventRow {
  id: string;
  field_id: string;
  event_id: string;
  event_code: string;
  level: string;
  category: string;
  message: string;
  context: Record<string, string>;
  occurred_at: Date | string;
  received_at: Date | string;
  field_name: string | null;
}

/** Liste DTO — saha adı JOIN ile gelir. */
export interface FieldEventDto {
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

/** FieldEventCollector yapılandırması. */
export interface FieldEventCollectorConfig {
  /** Sorgu zaman kaynağı — testlerde deterministik. */
  now?: () => number;
  /**
   * Demo bildirim seed'i (yalnızca lab — FIELD_EVENTS_DEMO_SEED):
   * açılışta sabit eventId'li örnek satırlar ON CONFLICT ile eklenir
   * (görsellik için; üretimde kapalıdır).
   */
  demoSeed?: boolean;
}

const toDto = (row: FieldEventRow): FieldEventDto => ({
  fieldId: row.field_id,
  fieldName: row.field_name ?? row.field_id,
  eventId: row.event_id,
  eventCode: row.event_code,
  level: row.level,
  category: row.category,
  message: row.message,
  context: row.context,
  occurredAt: new Date(row.occurred_at).toISOString(),
});

/**
 * FieldEventCollector — boss tier olay toplayıcı (Boss Faz 5, §7.6).
 * Registry gözlemcisi olarak `event` frame'lerini dinler; `field_events`
 * tablosuna (field_id, event_id) dedupe ile yazar — backlog yeniden gönderimi
 * güvenlidir. Toplama whitelist'i field'la birebir (savunma katmanı).
 */
export class FieldEventCollector {
  private unsubscribe?: () => void;

  constructor(
    private readonly sql: ISqlDatabase,
    private readonly logger: ILogger | undefined,
    private readonly config: FieldEventCollectorConfig = {},
  ) {}

  async ensureSchema(): Promise<void> {
    await this.sql.execute(DDL);
    if (this.config.demoSeed) {
      await this.seedDemoEvents();
    }
  }

  /** Lab görselliği — sabit eventId'li örnek bildirimler (idempotent). */
  private async seedDemoEvents(): Promise<void> {
    const now = (this.config.now ?? (() => Date.now()))();
    const demos = [
      {
        eventId: "demo:alarm:1",
        eventCode: "device_alarm",
        level: "error",
        message: "PCS-1: DC aşırı akım alarmı",
        context: { deviceId: "pcs-1" },
        agoMs: 45 * 60 * 1000,
      },
      {
        eventId: "demo:alarm:2",
        eventCode: "device_alarm",
        level: "warn",
        message: "PCS-2: Sıcaklık yüksek (75°C)",
        context: { deviceId: "pcs-2" },
        agoMs: 18 * 60 * 1000,
      },
      {
        eventId: "demo:alarm:3",
        eventCode: "device_alarm_cleared",
        level: "info",
        message: "PCS-1: Aşırı akım alarmı sonlandı",
        context: { deviceId: "pcs-1" },
        agoMs: 5 * 60 * 1000,
      },
    ] as const;
    for (const demo of demos) {
      await this.sql.execute(
        `INSERT INTO field_events
           (field_id, event_id, event_code, level, category, message, context, occurred_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8)
         ON CONFLICT (field_id, event_id) DO NOTHING`,
        [
          "demo-field",
          demo.eventId,
          demo.eventCode,
          demo.level,
          "app",
          demo.message,
          JSON.stringify(demo.context),
          new Date(now - demo.agoMs).toISOString(),
        ],
      );
    }
  }

  /** Registry observer'ına abone olur (komut). */
  attach(registry: FieldRegistry): void {
    this.unsubscribe = registry.addObserver({
      onControlMessage: (fieldId, message) => {
        const msg = message as { type?: string };
        if (msg.type === "event") {
          void this.collect(fieldId, message as EventMessage);
        }
      },
    });
  }

  /** Aboneliği kaldırır (komut). */
  stop(): void {
    this.unsubscribe?.();
    this.unsubscribe = undefined;
  }

  /** Son N olay (sorgu — en yeniden). `after` ISO ise o zamandan yenileri. */
  async list(input: { limit?: number; after?: string }): Promise<FieldEventDto[]> {
    const limit = input.limit ?? 100;
    const rows = await this.sql.query<FieldEventRow>(
      `SELECT fe.*, f.name AS field_name
       FROM field_events fe
       LEFT JOIN admin_fields f ON f.id::text = fe.field_id
       WHERE ($1::timestamptz IS NULL OR fe.received_at > $1)
       ORDER BY fe.received_at DESC
       LIMIT $2`,
      [input.after ?? null, limit],
    );
    return rows.map(toDto);
  }

  /** Verilen zamandan sonraki olay sayısı (sorgu — rozet besler). */
  async countSince(after: string): Promise<number> {
    const rows = await this.sql.query<{ n: number }>(
      `SELECT COUNT(*)::bigint AS n FROM field_events WHERE received_at > $1`,
      [after],
    );
    return Number(rows[0]?.n ?? 0);
  }

  /** Tek olay toplar (sorgu + yan etki — dedupe). */
  private async collect(fieldId: string, event: EventMessage): Promise<void> {
    if (!COLLECTED_EVENT_CODES.includes(event.eventCode as never)) return;
    try {
      await this.sql.execute(
        `INSERT INTO field_events
           (field_id, event_id, event_code, level, category, message, context, occurred_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8)
         ON CONFLICT (field_id, event_id) DO NOTHING`,
        [
          fieldId,
          event.eventId,
          event.eventCode,
          event.level,
          event.category,
          event.message,
          JSON.stringify(event.context ?? {}),
          event.timestamp,
        ],
      );
    } catch (error) {
      this.logger
        ?.log({
          level: "error",
          category: "app",
          eventCode: "field_event_failed",
          message: "Olay toplama basarisiz",
          context: { fieldId, eventId: event.eventId },
        })
        .catch(() => {});
      void error;
    }
  }
}
