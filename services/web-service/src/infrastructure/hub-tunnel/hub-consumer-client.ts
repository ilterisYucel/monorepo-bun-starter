import type {
  HubAccessRequest,
  HubPeerSummary,
  HubSessionInput,
  HubSessionResult,
  IHubTunnelPort,
} from "../../domain/ports/hub-tunnel";

/** Hub-servis consumer client yapılandırması. */
export interface HubConsumerClientConfig {
  /** Hub-servis taban URL (örn. http://hub:5003). */
  baseUrl: string;
  /** Consumer token (peer token'ından AYRI). */
  token: string;
  /** Test enjeksiyonu için fetch. */
  fetchImpl?: typeof fetch;
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
 * HubConsumerClient — `IHubTunnelPort`'un fetch tabanlı adaptörü.
 *
 * Framework bilmez; `fetch` enjekte edilebilir. Hub'ın REST yüzeyi:
 * `GET /peers`, `GET /peers/:pid/services/:sid/*` (opak), `POST /sessions`.
 */
export class HubConsumerClient implements IHubTunnelPort {
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

  openSession(input: HubSessionInput): Promise<HubSessionResult> {
    return this.json<HubSessionResult>("/sessions", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  /** Opak programatik erişim — ham Response (stream/JSON çağıran çözümler). */
  async access(request: HubAccessRequest): Promise<Response> {
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
