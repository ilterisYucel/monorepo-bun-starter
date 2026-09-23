// OperationResponder — field tier: boss'tan gelen operation-execute
// frame'lerini yerel yürütücüye delege eden ve operation-result ile
// yanıtlayan bileşen (WS-TUNNEL-KAPASITE §5.2).

import {
  operationExecuteSchema,
} from "@gd-monorepo/ws-tunnel";
import type {
  OperationExecuteMessage,
  OperationResultMessage,
  OperationStepResult,
} from "@gd-monorepo/ws-tunnel";
import type { ITunnelChannel } from "@gd-monorepo/ws-tunnel";
import type { TamperLogger } from "@gd-monorepo/tamper-logger";
import type { OperationExecutor, OperationRunResult } from "@gd-monorepo/platform-commands";

/** OperationResponder yapılandırması — tek obje (DI kuralı 3). */
export interface OperationResponderConfig {
  /** Field→boss uplink kanalı (TunnelConnector, peerType "field"). */
  channel: ITunnelChannel;
  executor: OperationExecutor;
  logger?: TamperLogger;
}

function mapResults(result: OperationRunResult): OperationStepResult[] {
  return result.outcomes.map((o) => ({
    step: o.stepIndex,
    ...(o.system !== undefined ? { system: o.system } : {}),
    ...(o.maneuver !== undefined ? { maneuver: o.maneuver } : {}),
    ok: o.success,
    ...(o.reason !== undefined ? { reason: o.reason } : {}),
  }));
}

/**
 * OperationResponder — operation-execute → yürütme → operation-result.
 *
 * Sözleşme (test: operation-responder.test.ts):
 * - Girdi `operationExecuteSchema` (STRICT) ile doğrulanır — güvenilmez boss
 *   girdisi yürütücüye ham ULAŞMAZ; geçersiz → rejected (invalid_request).
 * - Yürütme `trigger = boss:<operationId>` + `createdBy = boss` ile çalışır;
 *   traceId boss frame'inden aktarılır.
 * - Sonuç her durumda gönderilir (rejected dahil); yürütme hatası kanalı
 *   KAPATMAZ (kademeli bozulma — telemetry-query deseni).
 * - Audit: operation_boss_request / operation_result_sent (best-effort —
 *   yürütme akışını kesmez; WS-TUNNEL §8).
 */
export class OperationResponder {
  private unsubscribe?: () => void;

  constructor(
    private readonly channel: ITunnelChannel,
    private readonly executor: OperationExecutor,
    private readonly logger?: TamperLogger,
  ) {}

  /** Kanal aboneliğini kurar (komut). Tekrar çağrılırsa önceki sökülür. */
  start(): void {
    if (this.unsubscribe) return;
    this.unsubscribe = this.channel.onMessage((message) => {
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
    if (type !== "operation-execute") return;

    const raw = message as OperationExecuteMessage;
    const parsed = operationExecuteSchema.safeParse(message);
    if (!parsed.success) {
      this.respond({
        type: "operation-result",
        operationId:
          typeof raw?.operationId === "string" ? raw.operationId : "unknown",
        status: "rejected",
        reason: "invalid_request",
      });
      return;
    }
    const request = parsed.data;

    await this.audit("operation_boss_request", {
      operationId: request.operationId,
      name: request.name,
    });

    try {
      const result = await this.executor.execute(
        "operation",
        request.name,
        request.params ?? {},
        {
          trigger: `boss:${request.operationId}`,
          createdBy: "boss",
          ...(request.traceId !== undefined
            ? { traceId: request.traceId }
            : {}),
        },
      );
      this.respond({
        type: "operation-result",
        operationId: request.operationId,
        status: result.status,
        ...(result.reason !== undefined ? { reason: result.reason } : {}),
        results: mapResults(result),
      });
    } catch (error) {
      this.respond({
        type: "operation-result",
        operationId: request.operationId,
        status: "failed",
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private respond(frame: OperationResultMessage): void {
    void this.audit("operation_result_sent", {
      operationId: frame.operationId,
      status: frame.status,
    });
    this.channel.sendControl(frame);
  }

  private async audit(
    eventCode: "operation_boss_request" | "operation_result_sent",
    context: Record<string, unknown>,
  ): Promise<void> {
    if (!this.logger) return;
    try {
      await this.logger.log({
        level: "info",
        category: "audit",
        eventCode,
        message: eventCode,
        context,
      });
    } catch {
      // best-effort — yürütme akışı kesilmez (WS-TUNNEL §8)
    }
  }
}
