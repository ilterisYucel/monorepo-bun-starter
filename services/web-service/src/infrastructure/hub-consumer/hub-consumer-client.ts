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
  readonly services: ReadonlyArray<{ readonly id: string; readonly meta?: unknown }>;
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
  readonly body?: BodyInit | null;
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

  peers(): Promise<HubPeerSummary[]> {
    return this.json<{ peers: HubPeerSummary[] }>("/peers").then(
      (data) => data.peers,
    );
  }

  servicesOf(peerId: string): Promise<HubPeerSummary["services"]> {
    return this.json<{ services: HubPeerSummary["services"] }>(
      `/peers/${encodeURIComponent(peerId)}/services`,
    ).then((data) => data.services);
  }

  async sendControl(peerId: string, message: unknown): Promise<void> {
    await this.json(`/control/${encodeURIComponent(peerId)}`, {
      method: "POST",
      body: JSON.stringify(message),
    });
  }

  /** Admin: peer oluşturur + tek kullanımlık bootstrap üretir. */
  createPeer(peerId: string): Promise<{
    peerId: string;
    bootstrapToken: string;
    expiresAt: string;
  }> {
    return this.json(`/admin/peers`, {
      method: "POST",
      body: JSON.stringify({ peerId }),
    });
  }

  /** Admin: peer kimliğini iptal eder + aktif bağlantıyı düşürür. */
  async revokePeer(peerId: string): Promise<void> {
    await this.json(`/admin/peers/${encodeURIComponent(peerId)}`, {
      method: "DELETE",
    });
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
    const path = request.path.startsWith("/") ? request.path : `/${request.path}`;
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
