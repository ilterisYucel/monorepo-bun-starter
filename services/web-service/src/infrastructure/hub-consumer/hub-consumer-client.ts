/** Hub-servis consumer client yapılandırması. */
export interface HubConsumerClientConfig {
  /** Hub-servis taban URL (örn. http://hub:5003). */
  baseUrl: string;
  /** Consumer token (peer token'ından AYRI). */
  token: string;
  /** Test enjeksiyonu için fetch. */
  fetchImpl?: typeof fetch;
}

/** Hub keşif peer özeti. */
export interface HubPeerSummary {
  readonly peerId: string;
  readonly peerType: string;
  readonly status: string;
  readonly services: ReadonlyArray<{
    readonly id: string;
    readonly meta?: unknown;
  }>;
}

/** Hub tarafından açılan oturum. */
export interface HubSessionResult {
  readonly sessionId: string;
  readonly token: string;
  readonly expiresInSec: number;
}

/** Programatik erişim isteği (komut/manevra). */
export interface HubAccessRequest {
  readonly peerId: string;
  readonly serviceId: string;
  readonly path: string;
  readonly method?: string;
  readonly headers?: Record<string, string>;
  /** Gövde — tüm çağıranlar JSON string geçer (global `BodyInit` bu tsconfig'de yok). */
  readonly body?: string | null;
}

/** Hub REST hatası. */
export class HubConsumerError extends Error {
  constructor(
    readonly path: string,
    readonly status: number,
  ) {
    super(`[HubConsumer] ${path} → HTTP ${status}`);
    this.name = "HubConsumerError";
  }
}

/**
 * HubConsumerClient — hub-servis REST uçlarının tipli sarmalayıcısı.
 *
 * Framework bilmez; `fetch` enjekte edilebilir. WS relay ayrı sınıftadır.
 */
export class HubConsumerClient {
  private readonly baseUrl: string;
  private readonly token: string;
  private readonly fetchImpl: typeof fetch;

  constructor(config: HubConsumerClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/+$/, "");
    this.token = config.token;
    this.fetchImpl = config.fetchImpl ?? fetch;
  }

  async peers(): Promise<HubPeerSummary[]> {
    const data = await this.json<{ peers: HubPeerSummary[] }>("/peers");
    return data.peers;
  }

  openSession(input: {
    peerId: string;
    user: { id: string; username: string; role: string };
    remoteIp?: string;
  }): Promise<HubSessionResult> {
    return this.json<HubSessionResult>("/sessions", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  /** Opak programatik erişim — ham Response (stream/JSON çağıran çözümler). */
  access(request: HubAccessRequest): Promise<Response> {
    const path = request.path.startsWith("/")
      ? request.path
      : `/${request.path}`;
    const url = `${this.baseUrl}/peers/${encodeURIComponent(request.peerId)}/services/${encodeURIComponent(request.serviceId)}${path}`;
    return this.fetchImpl(url, {
      method: request.method ?? "GET",
      headers: this.headers(request.headers),
      body: request.body,
    });
  }

  private headers(extra?: Record<string, string>): Record<string, string> {
    return {
      authorization: `Bearer ${this.token}`,
      "content-type": "application/json",
      ...extra,
    };
  }

  private async json<T>(
    path: string,
    init?: { method?: string; body?: string },
  ): Promise<T> {
    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      method: init?.method ?? "GET",
      headers: this.headers(),
      body: init?.body,
    });
    if (!response.ok) throw new HubConsumerError(path, response.status);
    return (await response.json()) as T;
  }
}
