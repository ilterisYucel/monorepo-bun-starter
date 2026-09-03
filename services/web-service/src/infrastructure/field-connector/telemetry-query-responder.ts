import { telemetryQuerySchema } from "@gd-monorepo/ws-tunnel";
import type { TelemetryQueryErrorMessage, TelemetryResultMessage } from "@gd-monorepo/ws-tunnel";
import type { LogEventCode } from "@gd-monorepo/platform-logging";

import { TamperLogger } from "@gd-monorepo/tamper-logger";

import type { FieldConnector } from "@gd-monorepo/ws-tunnel";
import type { ITelemetrySeriesSource } from "./interfaces";

/**
 * TelemetryQueryResponder — Faz 5.1 (konteyner tarafı):
 * Field'dan gelen `telemetry-query` kontrol frame'lerini yanıtlar.
 *
 * - Girdi `telemetryQuerySchema` (zod) ile doğrulanır — güvenilmez field
 *   girdisi asla TimescaleDB'ye ham ulaşmaz; geçersiz → `telemetry-query-error`.
 * - Sorgu `ITelemetrySeriesSource.series()` ile çalışır; hata → aynı error
 *   frame'i (kademeli bozulma — WS kanalı etkilenmez).
 * - Yanıtlar `FieldConnector.sendControl` ile AYNI outbound kanaldan gider
 *   (tasarım R4/R5: konteynere inbound HTTP yok).
 */
export class TelemetryQueryResponder {
  private unsubscribe?: () => void;

  constructor(
    private readonly connector: FieldConnector,
    private readonly source: ITelemetrySeriesSource,
    private readonly logger?: TamperLogger,
  ) {}

  /** Kanal aboneliğini kurar (komut). Tekrar çağrılırsa önceki sökülür. */
  start(): void {
    if (this.unsubscribe) return;
    this.unsubscribe = this.connector.onMessage((message) => {
      void this.handle(message);
    });
  }

  /** Aboneliği söker (komut). */
  stop(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = undefined;
    }
  }

  private async handle(message: unknown): Promise<void> {
    const type = (message as { type?: unknown } | null)?.type;
    if (type !== "telemetry-query") return;

    const rawQueryId = (message as { queryId?: unknown }).queryId;
    const parsed = telemetryQuerySchema.safeParse(message);
    if (!parsed.success) {
      this.reject(
        typeof rawQueryId === "string" ? rawQueryId : undefined,
        "gecersiz telemetry-query",
      );
      return;
    }
    const query = parsed.data;

    try {
      const data = await this.source.series({
        from: new Date(query.from),
        to: new Date(query.to),
        points: query.points,
        ...(query.deviceIds !== undefined ? { deviceIds: query.deviceIds } : {}),
        ...(query.names !== undefined ? { names: query.names } : {}),
      });
      const frame: TelemetryResultMessage = {
        type: "telemetry-result",
        queryId: query.queryId,
        data,
      };
      this.connector.sendControl(frame);
    } catch (error) {
      this.reject(
        query.queryId,
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  private reject(queryId: string | undefined, message: string): void {
    this.log("warn", "app", "telemetry_query_failed", "Telemetri sorgusu basarisiz", {
      queryId: queryId ?? "unknown",
      reason: message,
    });
    const frame: TelemetryQueryErrorMessage = {
      type: "telemetry-query-error",
      queryId: queryId ?? "unknown",
      message,
    };
    this.connector.sendControl(frame);
  }

  private log(
    level: "info" | "warn",
    category: "app" | "security",
    eventCode: LogEventCode,
    message: string,
    context?: Record<string, unknown>,
  ): void {
    if (!this.logger) return;
    void this.logger
      .log({ level, category, eventCode, message, context })
      .catch(() => {});
  }
}
