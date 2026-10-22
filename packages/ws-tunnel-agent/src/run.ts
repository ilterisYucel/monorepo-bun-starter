import {
  ClientSessionServer,
  ClientSessionStore,
  ReconnectDelay,
  TunnelClient,
  TunnelConnector,
  WsSocketClientFactory,
} from "@gd-monorepo/ws-tunnel";
import type { ITokenSigner, SessionTokenPayload } from "@gd-monorepo/ws-tunnel";
import type { AgentConfig } from "./config";
import { signAgentToken, verifyAgentToken } from "./hmac-signer";

/** Çalışan agent tutamacı — kapanışı temizler. */
export interface AgentHandle {
  stop(): Promise<void>;
}

class AgentTokenSigner implements ITokenSigner {
  constructor(private readonly secret: string) {}

  sign(payload: SessionTokenPayload, expiresInSec: number): Promise<string> {
    return signAgentToken(this.secret, payload, expiresInSec);
  }

  verify(token: string): Promise<SessionTokenPayload | undefined> {
    return verifyAgentToken(this.secret, token);
  }
}

/**
 * Agent'ı başlatır (komut): hub'a WS ile bağlanır, yerel hedefi opak tüneller,
 * oturum token'larını `hubSecret` ile imzalar. Çağıran `stop()` ile kapatır.
 */
export async function startAgent(
  config: AgentConfig,
  options: { hubSecret: string },
): Promise<AgentHandle> {
  if (config.tlsInsecure && config.localTarget.startsWith("https://")) {
    // Cihaz self-signed sertifikası: yalnız bu süreç için doğrulama kapatılır.
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  }

  const wsBase = config.hubUrl.replace(/^http/, "ws");
  const connector = new TunnelConnector(
    {
      wsUrls: [`${wsBase}/ws/peer`],
      token: config.peerSecret ?? config.peerToken ?? "",
      peerId: config.peerId,
      peerType: config.peerType,
      services: [{ id: config.serviceId }],
      heartbeatIntervalMs: config.heartbeatIntervalMs,
      registerTimeoutMs: 5000,
      livenessTimeoutMs: config.livenessTimeoutMs,
    },
    new WsSocketClientFactory(),
    new ReconnectDelay({ baseMs: 200, maxMs: 2000, jitterSpanMs: 0, jitter: () => 0 }),
  );

  const tunnelClient = TunnelClient.create({
    webServiceUrl: config.localTarget,
    staticUrl: config.localTarget,
  });
  tunnelClient.attach(connector);

  const sessionServer = new ClientSessionServer(
    connector,
    new ClientSessionStore(new AgentTokenSigner(options.hubSecret)),
    undefined,
  );
  sessionServer.start();
  await connector.start();

  console.log(
    `[peer-agent] '${config.peerId}' → ${config.hubUrl} (servis: ${config.serviceId}, hedef: ${config.localTarget})`,
  );

  return {
    stop: async () => {
      sessionServer.stop();
      await connector.stop();
      tunnelClient.stop();
    },
  };
}
