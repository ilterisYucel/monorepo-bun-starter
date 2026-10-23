/**
 * Hub tünel erişim portu (domain) — SPEC WEB-SERVICE-KATMANLAMA UC-7/K14.
 *
 * Endpoint-agnostik: hedef uygulamanın API'sini bilmez; `path` opak taşınır.
 * Framework/fetch ayrıntısı adaptörde (`HubConsumerClient`, infrastructure).
 */

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

/** Kullanıcı adına oturum açma girdisi. */
export interface HubSessionInput {
  readonly peerId: string;
  readonly user: { readonly id: string; readonly username: string; readonly role: string };
  readonly remoteIp?: string;
}

/** Programatik opak erişim isteği. */
export interface HubAccessRequest {
  readonly peerId: string;
  readonly serviceId: string;
  readonly path: string;
  readonly method?: string;
  readonly headers?: Record<string, string>;
  readonly body?: string | null;
}

export interface IHubTunnelPort {
  peers(): Promise<HubPeerSummary[]>;
  access(request: HubAccessRequest): Promise<Response>;
  openSession(input: HubSessionInput): Promise<HubSessionResult>;
}
