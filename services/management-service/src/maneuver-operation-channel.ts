// Manevra/operasyon delegasyon kanalı — kural aksiyonlarının web-service
// yürütücüsüne iletilmesi (KURAL-MOTORU-V2 §3.2). management-service kaydı
// YÜKLEMEZ — yürütmeyi iç token ile web-service'e devreder.

/** Kanal sonucu — başarısızlık throw DEĞİL, sonuçla taşınır. */
export interface ManeuverOperationResult {
  ok: boolean;
  /** 202 — yürütme ARKA PLANDA sürüyor; terminal durum operation_* audit'inden izlenir. */
  started?: boolean;
  reason?: string;
  /** İz kimliği — kural audit ↔ operasyon koşusu eşlemesi. */
  traceId: string;
}

/**
 * IManeuverOperationChannel — manevra/operasyon yürütme delegasyon sözleşmesi.
 * Implementasyon: `HttpManeuverOperationChannel` (web-service REST + iç token).
 */
export interface IManeuverOperationChannel {
  execute(
    kind: "maneuver" | "operation",
    name: string,
    params: Record<string, unknown> | undefined,
    traceId: string,
  ): Promise<ManeuverOperationResult>;
}

/** HTTP kanal yapılandırması — tek obje (DI kuralı 3). */
export interface HttpManeuverOperationChannelConfig {
  /** Web-service taban adresi (ör. http://web-service:5001). */
  baseUrl: string;
  /** Programatik kanal gizli token'ı (web-service env ile eşleşir). */
  internalToken?: string;
  /** Senkron bekleme üst sınırı (ms) — varsayılan 20 sn (route 15 sn'de 202 döner). */
  timeoutMs?: number;
  /** fetch implementasyonu — testlerde enjekte edilir. */
  fetchFn?: typeof fetch;
}

const DEFAULT_TIMEOUT_MS = 20_000;

/**
 * HttpManeuverOperationChannel — web-service manevra/operasyon yürütme
 * rotasını çağıran HTTP kanal (KURAL-MOTORU-V2 §3.2).
 *
 * Sözleşme (test: maneuver-operation-channel.test.ts):
 * - POST {baseUrl}/api/maneuvers|operations/{name}/execute; gövde {params};
 *   başlıklar x-gd-trace-id + x-internal-token (fail-closed: token yoksa
 *   web-service iç token yolunu KAPATIR — 403 → ok:false).
 * - 200 + status completed|rolled_back → ok; status failed/rejected →
 *   ok:false + reason (operation_disabled 409 dahil — UC-4).
 * - 202 → ok + started (arka planda sürüyor — terminal durum audit'ten).
 * - Timeout (AbortController) / network / 4xx-5xx → ok:false + reason
 *   (throw YOK — kademeli bozulma).
 */
export class HttpManeuverOperationChannel implements IManeuverOperationChannel {
  private readonly baseUrl: string;
  private readonly internalToken: string | undefined;
  private readonly timeoutMs: number;
  private readonly fetchFn: typeof fetch;

  constructor(config: HttpManeuverOperationChannelConfig) {
    if (!config.baseUrl) {
      throw new Error("[HttpManeuverOperationChannel] baseUrl zorunlu");
    }
    this.baseUrl = config.baseUrl.replace(/\/+$/, "");
    this.internalToken = config.internalToken;
    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.fetchFn = config.fetchFn ?? fetch;
  }

  async execute(
    kind: "maneuver" | "operation",
    name: string,
    params: Record<string, unknown> | undefined,
    traceId: string,
  ): Promise<ManeuverOperationResult> {
    const prefix = kind === "maneuver" ? "maneuvers" : "operations";
    const url = `${this.baseUrl}/api/${prefix}/${encodeURIComponent(name)}/execute`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await this.fetchFn(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-gd-trace-id": traceId,
          ...(this.internalToken
            ? { "x-internal-token": this.internalToken }
            : {}),
        },
        body: JSON.stringify({ params: params ?? {} }),
        signal: controller.signal,
      });

      if (response.status === 202) {
        return { ok: true, started: true, traceId };
      }

      const body = (await response.json().catch(() => ({}))) as {
        status?: string;
        reason?: string;
        error?: string;
      };
      if (response.ok && (body.status === "completed" || body.status === "rolled_back")) {
        return { ok: true, traceId };
      }
      return {
        ok: false,
        reason:
          body.reason ??
          body.error ??
          (body.status !== undefined ? body.status : `http ${response.status}`),
        traceId,
      };
    } catch (error) {
      const aborted =
        error instanceof Error && error.name === "AbortError";
      return {
        ok: false,
        reason: aborted ? "timeout" : String(error),
        traceId,
      };
    } finally {
      clearTimeout(timer);
    }
  }
}
