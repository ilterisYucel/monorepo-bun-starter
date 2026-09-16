// Konteyner komut kanalı — field tier kural aksiyonlarının konteyner cihazına
// komut iletim sözleşmesi (WS4 D4). Kaynak tasarım:
// docs/architecture/FIELD-MANEVRA-KATALOGU-REV01-MIMARISI.md §5 + WS4 planı.

/** Kanal sonucu — başarısızlık throw DEĞİL, sonuçla taşınır. */
export interface ContainerCommandResult {
  ok: boolean;
  reason?: string;
  /** İz kimliği — field log ↔ konteyner log eşlemesi. */
  traceId: string;
}

/** Kanal girdisi — tek komut (execute-multi çoğullaması kanal içinde). */
export interface ContainerCommandInput {
  containerId: string;
  deviceId: string;
  command: string;
  params?: Record<string, unknown>;
  /** Çağıran kural adı — trace öneki (auto:<kural>). */
  traceId: string;
}

/**
 * IContainerCommandChannel — konteyner komut iletim sözleşmesi.
 *
 * Implementasyonlar: `HttpContainerCommandChannel` (field web-service komut
 * proxy rotası — WS4 D3), testlerde in-memory fake. Komut semantiği kanalda
 * DEĞİLDİR — konteyner siyah kutudur; kanal yalnızca durum/sonuç taşır.
 */
export interface IContainerCommandChannel {
  send(input: ContainerCommandInput): Promise<ContainerCommandResult>;
}

/** HTTP kanal yapılandırması — tek obje (DI kuralı 3). */
export interface HttpContainerCommandChannelConfig {
  /** Field web-service taban adresi (ör. http://web-service:5001). */
  baseUrl: string;
  /** Saha kimliği — proxy rota yolu için. */
  fieldId: string;
  /** Programatik kanal gizli token'ı (field web-service env ile eşleşir). */
  internalToken?: string;
  /** fetch implementasyonu — testlerde enjekte edilir. */
  fetchFn?: typeof fetch;
}

/**
 * HttpContainerCommandChannel — field web-service komut proxy rotasını
 * çağıran HTTP kanal (WS4 D3/D4).
 *
 * Sözleşme (test: container-command-channel.test.ts):
 * - POST {baseUrl}/api/fields/{fieldId}/containers/{containerId}/commands
 *   gövde: {commands:[{deviceId, command, params}], mode:"sequential",
 *   onFailure:"stop"}; başlık x-gd-trace-id.
 * - 2xx → ok; gövdedeki sonuçların success=false olması → ok=false + reason
 *   (ilk başarısız adımın gerekçesi).
 * - 4xx/5xx/network hatası → ok=false + reason (throw YOK).
 */
export class HttpContainerCommandChannel implements IContainerCommandChannel {
  private readonly baseUrl: string;
  private readonly fieldId: string;
  private readonly internalToken: string | undefined;
  private readonly fetchFn: typeof fetch;

  constructor(config: HttpContainerCommandChannelConfig) {
    if (!config.baseUrl || !config.fieldId) {
      throw new Error("[HttpContainerCommandChannel] baseUrl + fieldId zorunlu");
    }
    this.baseUrl = config.baseUrl.replace(/\/+$/, "");
    this.fieldId = config.fieldId;
    this.internalToken = config.internalToken;
    this.fetchFn = config.fetchFn ?? fetch;
  }

  async send(input: ContainerCommandInput): Promise<ContainerCommandResult> {
    const url = `${this.baseUrl}/api/fields/${encodeURIComponent(this.fieldId)}/containers/${encodeURIComponent(input.containerId)}/commands`;
    try {
      const response = await this.fetchFn(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-gd-trace-id": input.traceId,
          ...(this.internalToken
            ? { "x-internal-token": this.internalToken }
            : {}),
        },
        body: JSON.stringify({
          commands: [
            {
              deviceId: input.deviceId,
              command: input.command,
              params: input.params ?? {},
            },
          ],
          mode: "sequential",
          onFailure: "stop",
        }),
      });

      const body = (await response.json().catch(() => ({}))) as {
        results?: Array<{ success?: boolean; reason?: string }>;
        error?: string;
      };
      const failed = (body.results ?? []).find((r) => r.success === false);
      if (!response.ok || failed) {
        return {
          ok: false,
          reason: failed?.reason ?? body.error ?? `http ${response.status}`,
          traceId: input.traceId,
        };
      }
      return { ok: true, traceId: input.traceId };
    } catch (error) {
      return {
        ok: false,
        reason: String(error),
        traceId: input.traceId,
      };
    }
  }
}
