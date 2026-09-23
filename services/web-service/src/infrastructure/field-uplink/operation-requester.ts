// OperationRequester — boss tier: field'a operation-execute gönderip
// operation-result bekleyen istemci (WS-TUNNEL-KAPASITE §5.2).

import type {
  OperationExecuteMessage,
  OperationResultMessage,
} from "@gd-monorepo/ws-tunnel";
import type { IHubChannel } from "@gd-monorepo/ws-tunnel";

/** OperationRequester yapılandırması — tek obje (DI kuralı 3). */
export interface OperationRequesterConfig {
  /** Boss→field hub kanalı (FieldUplinkChannel deseni). */
  channel: IHubChannel;
  /** operation-result bekleme üst sınırı (ms) — varsayılan 30 sn. */
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 30_000;

/**
 * OperationRequester — boss tier operasyon tetikleyicisi.
 *
 * Sözleşme (test: operation-requester.test.ts):
 * - `send`: operation-execute frame'i gönderir; AYNI `operationId` ile gelen
 *   operation-result çözülür (korelasyon — queryId deseni).
 * - Timeout / kopuk peer → `undefined` (isteyen 503'e çevirir; WS-TUNNEL §8
 *   "operation-result yerine timeout").
 * - Tek kullanımlık abonelik: sonuç veya timeout sonrası SÖKÜLÜR (sızıntı yok).
 */
export class OperationRequester {
  private readonly channel: IHubChannel;
  private readonly timeoutMs: number;

  constructor(config: OperationRequesterConfig) {
    this.channel = config.channel;
    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  /**
   * Komut — field'da operasyonu tetikler, sonucu bekler. Timeout → undefined
   * (kopukluk/kademeli bozulma sözleşmesi).
   */
  async send(
    fieldId: string,
    operationId: string,
    name: string,
    params: Record<string, unknown> = {},
    traceId?: string,
  ): Promise<OperationResultMessage | undefined> {
    return new Promise<OperationResultMessage | undefined>((resolve) => {
      let settled = false;
      let timeoutId: ReturnType<typeof setTimeout> | undefined;

      const finish = (value: OperationResultMessage | undefined): void => {
        if (settled) return;
        settled = true;
        if (timeoutId !== undefined) clearTimeout(timeoutId);
        unsubscribe();
        resolve(value);
      };

      const unsubscribe = this.channel.onControlMessage(
        (peerId: string, message: unknown) => {
          if (peerId !== fieldId) return;
          const type = (message as { type?: unknown } | null)?.type;
          if (type !== "operation-result") return;
          const result = message as OperationResultMessage;
          if (result.operationId !== operationId) return;
          finish(result);
        },
      );

      timeoutId = setTimeout(() => finish(undefined), this.timeoutMs);

      const frame: OperationExecuteMessage = {
        type: "operation-execute",
        operationId,
        name,
        ...(Object.keys(params).length > 0 ? { params } : {}),
        ...(traceId !== undefined ? { traceId } : {}),
      };
      this.channel.sendControl(fieldId, frame);
    });
  }
}
