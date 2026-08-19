/**
 * Domain-bagimsiz HTTP istemcisi.
 *
 * Plugin'lerin dis servislere erisimi icin ortak taban: EPIAS, hava durumu
 * vb. tum pluginler ayni istemciyi kullanir. Kaynaga ozel davranislar (auth
 * akislari, tarih formatlari) bu sinifi saran ayri client'larda tutulur
 * (bkz. @gd-monorepo/epias-client). Ileride SOAP/socket gibi farkli tasima
 * katmanlari icin ayri siniflar eklenir — hepsi ayni `src/` katmaninda
 * durur, plugin secimi yapar.
 */
export interface HttpClientConfig {
  /** Mutlak degilse path'lerin onune eklenen adres. */
  baseUrl?: string;
  /** Tum isteklere eklenen varsayilan header'lar. */
  defaultHeaders?: Record<string, string>;
  /** Istek zaman asimi (ms). */
  timeoutMs?: number;
  /** 5xx/ag hatasi sonrasi tekrar sayisi (toplam deneme = maxRetries + 1). */
  maxRetries?: number;
  /** Tekrarlar arasi bekleme tabani (ms) — her denemede katlanarak artar. */
  retryDelayMs?: number;
}

const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_MAX_RETRIES = 2;
const DEFAULT_RETRY_DELAY_MS = 250;

/** Fetch benzeri fonksiyon — testlerde sahte uygulamayla degistirilir. */
export type FetchLike = (
  input: string,
  init?: RequestInit,
) => Promise<Response>;

/** Sunucunun reddettigi istekler icin detayli hata. */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly body: string,
    url: string,
  ) {
    super(`[HttpClient] HTTP ${status} (${url}): ${body.slice(0, 200)}`);
    this.name = "HttpError";
  }
}

export class HttpClient {
  constructor(
    private readonly config: HttpClientConfig,
    private readonly fetchFn: FetchLike = fetch,
  ) {}

  /** Sorgu — GET istegi, JSON cevap. */
  getJson<T>(path: string, headers?: Record<string, string>): Promise<T> {
    return this.request<T>("GET", path, undefined, headers);
  }

  /** Sorgu — POST istegi, JSON govde, JSON cevap. */
  postJson<T>(
    path: string,
    body?: unknown,
    headers?: Record<string, string>,
  ): Promise<T> {
    return this.request<T>(
      "POST",
      path,
      body === undefined ? undefined : JSON.stringify(body),
      { "Content-Type": "application/json", ...headers },
    );
  }

  /** Sorgu — POST istegi, form-encoded govde (CAS gibi uc noktalar icin). */
  postForm<T>(
    path: string,
    fields: Record<string, string>,
    headers?: Record<string, string>,
  ): Promise<T> {
    return this.request<T>(
      "POST",
      path,
      new URLSearchParams(fields).toString(),
      { "Content-Type": "application/x-www-form-urlencoded", ...headers },
    );
  }

  /**
   * Sorgu — tekrar mekanizmasiyla ham istek.
   * 5xx ve ag/zaman asimi hatalarinda yeniden denenir; 4xx istemci
   * hatasidir ve hemen firlatilir.
   */
  private async request<T>(
    method: string,
    path: string,
    body?: string,
    headers?: Record<string, string>,
  ): Promise<T> {
    const url = `${this.config.baseUrl ?? ""}${path}`;
    const attempts = (this.config.maxRetries ?? DEFAULT_MAX_RETRIES) + 1;
    const baseDelay = this.config.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS;
    let lastError: unknown;

    for (let attempt = 0; attempt < attempts; attempt++) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(
          () => controller.abort(),
          this.config.timeoutMs ?? DEFAULT_TIMEOUT_MS,
        );
        try {
          const response = await this.fetchFn(url, {
            method,
            headers: { ...this.config.defaultHeaders, ...headers },
            body,
            signal: controller.signal,
          });
          if (!response.ok) {
            const text = await response.text();
            throw new HttpError(response.status, text, url);
          }
          return (await response.json()) as T;
        } finally {
          clearTimeout(timer);
        }
      } catch (error) {
        lastError = error;
        const retryable =
          error instanceof HttpError ? error.status >= 500 : true;
        if (!retryable || attempt === attempts - 1) {
          throw error;
        }
        await new Promise((resolve) =>
          setTimeout(resolve, baseDelay * (attempt + 1)),
        );
      }
    }

    throw lastError;
  }
}
