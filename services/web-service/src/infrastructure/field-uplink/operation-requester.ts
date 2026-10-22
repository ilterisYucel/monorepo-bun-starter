// OperationRequester — boss tier: field'da operasyonu hub opak relay (HTTP)
// üzerinden tetikler ve terminal sonucu bekler (SPEC UC-4).
//
// Public imza eski WS istemcisiyle AYNIDIR (`send(fieldId, operationId, name,
// params, traceId)`) — `operation-boss-routes` sözleşmesi değişmez.

import type { HubConsumerClient } from "../hub-consumer";

/** Operasyon adımı sonucu — makine-okunur özet. */
export interface OperationStepResult {
  step: number;
  system?: string;
  maneuver?: string;
  ok: boolean;
  reason?: string;
}

/**
 * Boss'a dönen terminal operasyon sonucu. `type` alanı eski WS frame'inin
 * yerine geçer (dış şekil değişmez — FR-4.5).
 */
export interface OperationResult {
  type: "operation-result";
  operationId: string;
  status: "completed" | "failed" | "rolled_back" | "rejected";
  reason?: string;
  results?: OperationStepResult[];
}

/** OperationRequester yapılandırması — tek obje (DI kuralı 3). */
export interface OperationRequesterConfig {
  /** Hub consumer client (opak relay). */
  client: HubConsumerClient;
  /** Field peer'ının duyurduğu servis kimliği (`hub.fieldServiceId`). */
  serviceId: string;
  /** Terminal yanıt bekleme üst sınırı (ms) — varsayılan 30 sn. */
  timeoutMs?: number;
}

/** Programatik erişim kimliği — hub, oturumu bu kullanıcı adına açar. */
const SYSTEM_USER_HEADERS = {
  "x-tunnel-user-id": "system",
  "x-tunnel-user-username": "system",
  "x-tunnel-user-role": "admin",
};

const DEFAULT_TIMEOUT_MS = 30_000;

/** Yürütme sonucu gövdesi (field `POST /api/operations/:name/execute`). */
interface OperationRunBody {
  status?: unknown;
  reason?: unknown;
  outcomes?: Array<{
    stepIndex?: unknown;
    system?: unknown;
    maneuver?: unknown;
    success?: unknown;
    reason?: unknown;
  }>;
}

function mapResults(
  outcomes: OperationRunBody["outcomes"],
): OperationStepResult[] | undefined {
  if (!Array.isArray(outcomes) || outcomes.length === 0) return undefined;
  return outcomes.map((o, index) => ({
    step: typeof o.stepIndex === "number" ? o.stepIndex : index,
    ...(typeof o.system === "string" ? { system: o.system } : {}),
    ...(typeof o.maneuver === "string" ? { maneuver: o.maneuver } : {}),
    ok: o.success === true,
    ...(typeof o.reason === "string" ? { reason: o.reason } : {}),
  }));
}

function reasonOf(body: unknown): string | undefined {
  if (typeof body !== "object" || body === null) return undefined;
  const { reason, error } = body as { reason?: unknown; error?: unknown };
  if (typeof reason === "string" && reason.length > 0) return reason;
  if (typeof error === "string" && error.length > 0) return error;
  return undefined;
}

/**
 * OperationRequester — boss tier operasyon tetikleyicisi (hub access HTTP).
 *
 * Sözleşme (test: operation-requester.test.ts):
 * - `send`: hub access üzerinden field'ın generic yürütme ucuna POST atar;
 *   `x-gd-operation-id`/`x-gd-trace-id` başlıkları kökeni taşır.
 * - Durum eşlemesi TERMINAL-only: 200 → çalıştırma durumu; 422 → failed;
 *   202 → failed (`still_running`); 4xx/5xx → rejected/failed; ağ hatası veya
 *   timeout → `undefined` (boss rotası 503 `operation_timeout` üretir).
 * - Yürütme hatası çağıranı fırlatmaz (kademeli bozulma).
 */
export class OperationRequester {
  private readonly client: HubConsumerClient;
  private readonly serviceId: string;
  private readonly timeoutMs: number;

  constructor(config: OperationRequesterConfig) {
    this.client = config.client;
    this.serviceId = config.serviceId;
    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  /**
   * Komut — field'da operasyonu tetikler, terminal sonucu bekler.
   * Timeout/kopukluk → undefined (kademeli bozulma sözleşmesi).
   */
  async send(
    fieldId: string,
    operationId: string,
    name: string,
    params: Record<string, unknown> = {},
    traceId?: string,
  ): Promise<OperationResult | undefined> {
    let response: Response;
    try {
      response = await this.withTimeout(
        this.client.access({
          peerId: fieldId,
          serviceId: this.serviceId,
          path: `/api/operations/${encodeURIComponent(name)}/execute`,
          method: "POST",
          headers: {
            ...SYSTEM_USER_HEADERS,
            "x-gd-operation-id": operationId,
            ...(traceId !== undefined ? { "x-gd-trace-id": traceId } : {}),
          },
          body: JSON.stringify({ params }),
        }),
      );
    } catch {
      return undefined;
    }

    const body = await this.json(response);
    const status = response.status;

    if (status === 200) {
      const runStatus =
        body?.status === "failed"
          ? "failed"
          : body?.status === "rolled_back"
            ? "rolled_back"
            : "completed";
      const reason = reasonOf(body);
      const results = mapResults(body?.outcomes);
      return {
        type: "operation-result",
        operationId,
        status: runStatus,
        ...(reason !== undefined ? { reason } : {}),
        ...(results !== undefined ? { results } : {}),
      };
    }

    if (status === 202) {
      return {
        type: "operation-result",
        operationId,
        status: "failed",
        reason: "still_running",
      };
    }

    if (status === 422) {
      const reason = reasonOf(body);
      const results = mapResults(body?.outcomes);
      return {
        type: "operation-result",
        operationId,
        status: "failed",
        ...(reason !== undefined ? { reason } : {}),
        ...(results !== undefined ? { results } : {}),
      };
    }

    if (status >= 400 && status < 500) {
      return {
        type: "operation-result",
        operationId,
        status: "rejected",
        reason: reasonOf(body) ?? "invalid_request",
      };
    }

    return {
      type: "operation-result",
      operationId,
      status: "failed",
      reason: reasonOf(body) ?? `remote_http_${status}`,
    };
  }

  /** Yanıtı JSON olarak çözer; gövde JSON değilse undefined. */
  private async json(response: Response): Promise<OperationRunBody | undefined> {
    try {
      return (await response.json()) as OperationRunBody;
    } catch {
      return undefined;
    }
  }

  /** Terminal yanıtı bekler; süre aşılırsa `undefined` (retry yok). */
  private withTimeout(request: Promise<Response>): Promise<Response> {
    return new Promise<Response>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error("operation_timeout")),
        this.timeoutMs,
      );
      request.then(
        (response) => {
          clearTimeout(timer);
          resolve(response);
        },
        (error: unknown) => {
          clearTimeout(timer);
          reject(error);
        },
      );
    });
  }
}
