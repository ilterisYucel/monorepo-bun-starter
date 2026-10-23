import type { ISqlDatabase } from "@gd-monorepo/core";
import type { ILogger } from "@gd-monorepo/ws-tunnel";
import type { IHubTunnelPort } from "../../../domain/ports/hub-tunnel";
import { SYSTEM_USER_HEADERS } from "../../../infrastructure/hub-tunnel/system-headers";
import type { FieldEventDto } from "../../../application/events/event-dto";

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


/** FieldEventCollector yapılandırması. */
export interface FieldEventCollectorConfig {
  /** Hub consumer client — boss tier'da zorunlu (poller taşıyıcısı). */
  client?: IHubTunnelPort;
  /** Field peer'ının duyurduğu servis kimliği (`hub.fieldServiceId`). */
  serviceId?: string;
  /** Poll aralığı (ms) — varsayılan 10 sn. */
  intervalMs?: number;
  /** Tur başına azami olay — varsayılan 200. */
  batchSize?: number;
  /** Sorgu zaman kaynağı — testlerde deterministik. */
  now?: () => number;
  /** Demo bildirim seed'i (lab görselliği). */
  demoSeed?: boolean;
}

const DEFAULT_INTERVAL_MS = 10_000;
const DEFAULT_BATCH_SIZE = 200;
const BACKLOG_WINDOW_MS = 60 * 60 * 1000;
/** Yeniden gönderim örtüşmesi (ms) — dedupe güvenli, kayıp önlenir. */
const OVERLAP_MS = 2_000;

/**
 * FieldEventCollector — boss tier olay toplayıcı (Boss Faz 5, §7.6).
 *
 * REV.02 (SPEC UC-5): WS `event` frame push'u yerine **HTTP pull** —
 * `start()` periyodik olarak hub'daki field peer'larını keşfeder ve her biri
 * için `GET /api/events?after=<cursor>` çağırır; olaylar `field_events`
 * tablosuna (field_id, event_id) dedupe ile yazılır (backlog yeniden
 * gönderimi güvenlidir). Peer hatası turu atlar, cursor ilerlemez.
 */
export class FieldEventCollector {
  private readonly client?: IHubTunnelPort;
  private readonly serviceId: string;
  private readonly intervalMs: number;
  private readonly batchSize: number;
  private readonly now: () => number;
  private readonly cursors = new Map<string, number>();
  private timer?: ReturnType<typeof setInterval>;

  constructor(
    private readonly sql: ISqlDatabase,
    private readonly logger: ILogger | undefined,
    private readonly config: FieldEventCollectorConfig = {},
  ) {
    this.client = config.client;
    this.serviceId = config.serviceId ?? "field-api";
    this.intervalMs = config.intervalMs ?? DEFAULT_INTERVAL_MS;
    this.batchSize = config.batchSize ?? DEFAULT_BATCH_SIZE;
    this.now = config.now ?? (() => Date.now());
  }

  async ensureSchema(): Promise<void> {
    await this.sql.execute(DDL);
    if (this.config.demoSeed) {
      await this.seedDemoEvents();
    }
  }

  /** Poll döngüsünü başlatır (komut). İlk tur hemen koşar; client yoksa no-op. */
  start(): void {
    if (!this.client || this.timer) return;
    void this.poll();
    this.timer = setInterval(() => void this.poll(), this.intervalMs);
  }

  /** Döngüyü durdurur (komut). */
  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
  }

  /** Bir pull turu (sorgu + yan etki) — field peer'ları keşfeder. */
  async poll(): Promise<void> {
    if (!this.client) return;
    let peers: Awaited<ReturnType<IHubTunnelPort["peers"]>>;
    try {
      peers = await this.client.peers();
    } catch (error) {
      this.warn("field_event_poll_failed", "Peer kesfi basarisiz", {
        error: String(error),
      });
      return;
    }
    const fields = peers.filter(
      (peer) => peer.peerType === "field" && peer.status === "connected",
    );
    await Promise.allSettled(fields.map((peer) => this.pullField(peer.peerId)));
  }

  /** Tek field için cursor'dan sonraki olayları çeker + yazar. */
  private async pullField(fieldId: string): Promise<void> {
    const cursor = this.cursors.get(fieldId);
    const afterMs =
      cursor === undefined
        ? this.now() - BACKLOG_WINDOW_MS
        : cursor - OVERLAP_MS;
    const after = encodeURIComponent(new Date(afterMs).toISOString());

    try {
      const response = await this.client!.access({
        peerId: fieldId,
        serviceId: this.serviceId,
        path: `/api/events?after=${after}&limit=${this.batchSize}`,
        headers: SYSTEM_USER_HEADERS,
      });
      if (!response.ok) {
        this.warn("field_event_poll_failed", "Olay ucu basarisiz", {
          fieldId,
          status: response.status,
        });
        return;
      }
      const body = (await response.json()) as { events?: unknown };
      if (!Array.isArray(body.events) || body.events.length === 0) return;

      const events = body.events as FieldEventDto[];
      await Promise.allSettled(
        events.map((event) => this.collect(fieldId, event)),
      );

      const last = events.at(-1);
      const lastMs = last ? new Date(last.timestamp).getTime() : Number.NaN;
      if (
        Number.isFinite(lastMs) &&
        (cursor === undefined || lastMs > cursor)
      ) {
        this.cursors.set(fieldId, lastMs);
      }
    } catch (error) {
      this.warn("field_event_poll_failed", "Olay cekimi basarisiz", {
        fieldId,
        error: String(error),
      });
    }
  }

  /** Lab görselliği — sabit eventId'li örnek bildirimler (idempotent). */
  private async seedDemoEvents(): Promise<void> {
    const now = this.now();
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
    await Promise.all(
      demos.map((demo) =>
        this.sql.execute(
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
        ),
      ),
    );
  }

  /** Tek olay toplar (sorgu + yan etki — dedupe). */
  private async collect(fieldId: string, event: FieldEventDto): Promise<void> {
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
      this.warn("field_event_failed", "Olay toplama basarisiz", {
        fieldId,
        eventId: event.eventId,
        error: String(error),
      });
    }
  }

  private warn(
    eventCode: string,
    message: string,
    context: Record<string, unknown>,
  ): void {
    this.logger
      ?.log({ level: "warn", category: "app", eventCode, message, context })
      .catch(() => {});
  }
}
