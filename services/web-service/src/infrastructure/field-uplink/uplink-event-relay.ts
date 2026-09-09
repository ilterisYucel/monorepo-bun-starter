import type { ISqlDatabase } from "@gd-monorepo/core";
import type { ITunnelChannel } from "@gd-monorepo/ws-tunnel";
import type { ILogger } from "@gd-monorepo/ws-tunnel";

/**
 * Boss'a aktarılacak olay whitelist'i (BOSS-UYGULAMA-MIMARISI.md §7.6):
 * cihaz alarm geçişleri + oturum audit'i. Tüm log akışı GÜRÜLTÜ olur —
 * yalnızca patronun kararında değer taşıyan geçişler aktarılır.
 */
export const UPLINK_EVENT_WHITELIST = [
  "device_alarm",
  "device_alarm_cleared",
  "alarm_resolved",
  "session_open",
  "session_end",
] as const;

/** UplinkEventRelay yapılandırması — opsiyonel alanlar testlerde enjekte edilir. */
export interface UplinkEventRelayConfig {
  /** Delta tarama aralığı (ms) — varsayılan 10 sn. */
  intervalMs?: number;
  /** Başlangıç backlog penceresi (ms) — varsayılan 1 saat (kopukluk telafisi). */
  backlogWindowMs?: number;
  /** Olay whitelist'i — varsayılan UPLINK_EVENT_WHITELIST. */
  whitelist?: readonly string[];
  /** Batch başına azami satır — varsayılan 200. */
  batchSize?: number;
  /** Zaman kaynağı — testlerde deterministik. */
  now?: () => number;
}

interface LogEventRow {
  ts: Date | string;
  level: string;
  category: string;
  event_code: string;
  message: string;
  context: unknown;
  seq: number | string;
  correlation_id: string | null;
  service: string;
}

const DEFAULT_INTERVAL_MS = 10_000;
const DEFAULT_BACKLOG_WINDOW_MS = 60 * 60 * 1000;
const DEFAULT_BATCH_SIZE = 200;

/**
 * UplinkEventRelay — field tier olay aktarıcısı (Boss Faz 5, §7.6).
 * `log_events` (TamperLogger zinciri — device-service alarm geçişleri dahil
 * tüm field servisleri aynı tabloya yazar) üzerinden whitelist'teki geçişler
 * uplink kanalından `event` frame'i olarak boss'a push edilir.
 *
 * Cursor ZAMAN-DAMGASIDIR (`seq` değil): TamperLogger zinciri her süreç
 * yeniden başlamasında `seq`'yi 1'den başlatır (yeni zincir); seq cursor
 * zincir kırılınca kör kalır. `eventId = <fieldId>:<correlation_id>` —
 * correlationId olaylar arasında benzersizdir (seq'den farklı olarak
 * yeniden başlatmalarda çakışmaz); boss `(field_id, event_id)` dedupe
 * ettiğinden örtüşme penceresi (2 sn) GÜVENLİDİR.
 * Uplink kapalıyken sendControl no-op — olaylar düşer; bağlantı açılınca
 * cursor kaldığı yerden devam eder.
 */
export class UplinkEventRelay {
  private readonly intervalMs: number;
  private readonly backlogWindowMs: number;
  private readonly whitelist: readonly string[];
  private readonly batchSize: number;
  private readonly now: () => number;
  /** Son gönderilen olayın zamanı (ms epoch) — ilk turda backlog başlangıcı. */
  private cursorMs: number | undefined;
  private timer?: ReturnType<typeof setInterval>;
  private started = false;

  /** Yeniden gönderim örtüşmesi (ms) — zincir yeniden başlatma/sıralama payı. */
  private static readonly OVERLAP_MS = 2_000;

  constructor(
    private readonly connector: ITunnelChannel,
    private readonly sql: ISqlDatabase,
    private readonly fieldId: string,
    private readonly logger: ILogger | undefined,
    config: UplinkEventRelayConfig = {},
  ) {
    this.intervalMs = config.intervalMs ?? DEFAULT_INTERVAL_MS;
    this.backlogWindowMs = config.backlogWindowMs ?? DEFAULT_BACKLOG_WINDOW_MS;
    this.whitelist = config.whitelist ?? UPLINK_EVENT_WHITELIST;
    this.batchSize = config.batchSize ?? DEFAULT_BATCH_SIZE;
    this.now = config.now ?? (() => Date.now());
  }

  /** İlk backlog + delta döngüsünü başlatır (komut). Çalışıyorsa no-op. */
  start(): void {
    if (this.started) return;
    this.started = true;
    void this.poll();
    this.timer = setInterval(() => void this.poll(), this.intervalMs);
  }

  /** Döngüyü durdurur (komut). */
  stop(): void {
    this.started = false;
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
  }

  /** Bir delta turu (sorgu + yan etki — push). */
  async poll(): Promise<void> {
    try {
      if (this.cursorMs === undefined) {
        await this.sendWindow(this.now() - this.backlogWindowMs);
        return;
      }
      await this.sendWindow(this.cursorMs - UplinkEventRelay.OVERLAP_MS);
    } catch (error) {
      this.log("warn", "uplink_event_failed", "Olay aktarim turu basarisiz", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /** `sinceMs` sonrası (örtüşme paylı) olayları gönderir + cursor'ı ilerletir. */
  private async sendWindow(sinceMs: number): Promise<void> {
    const rows = await this.sql.query<LogEventRow>(
      `SELECT ts, level, category, event_code, message, context, seq, correlation_id, service
       FROM log_events
       WHERE ts > $1 AND event_code = ANY($2::text[])
       ORDER BY ts ASC
       LIMIT $3`,
      [new Date(sinceMs).toISOString(), this.whitelist as unknown as string[], this.batchSize],
    );
    let lastTs = sinceMs;
    for (const row of rows) {
      if (!this.isWhitelisted(row)) continue;
      this.sendEvent(row);
      const rowTs = new Date(row.ts).getTime();
      if (rowTs > lastTs) lastTs = rowTs;
    }
    this.cursorMs = lastTs;
  }

  private isWhitelisted(row: LogEventRow): boolean {
    return this.whitelist.includes(row.event_code);
  }

  private sendEvent(row: LogEventRow): void {
    this.connector.sendControl({
      type: "event",
      eventId: `${this.fieldId}:${row.correlation_id ?? row.seq}`,
      timestamp: new Date(row.ts).toISOString(),
      level: row.level === "error" ? "error" : row.level === "warn" ? "warn" : "info",
      category: row.category === "security" ? "security" : "app",
      eventCode: row.event_code,
      message: row.message,
      context: this.stringifyContext(row.context),
    });
  }

  private stringifyContext(context: unknown): Record<string, string> | undefined {
    if (typeof context !== "object" || context === null) return undefined;
    const out: Record<string, string> = {};
    for (const [key, value] of Object.entries(context as Record<string, unknown>)) {
      if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
        out[key] = String(value);
      }
    }
    return Object.keys(out).length > 0 ? out : undefined;
  }

  private log(
    level: "info" | "warn",
    eventCode: string,
    message: string,
    context?: Record<string, unknown>,
  ): void {
    if (!this.logger) return;
    void this.logger
      .log({ level, category: "app", eventCode, message, context })
      .catch(() => {});
  }
}
