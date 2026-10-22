import { describe, it, expect } from "vitest";
import http from "node:http";
import { WebSocket } from "ws";
import {
  ClientSessionServer,
  ClientSessionStore,
  ReconnectDelay,
  TunnelClient,
  TunnelConnector,
  WsSocketClientFactory,
} from "@gd-monorepo/ws-tunnel";
import { createHub } from "./main";
import type { HubConfig } from "./config/hub-config";
import { JoseSignerForTests } from "../ws-tunnel/src/session/__test-helpers__/jose-signer";

const PEER_TOKEN = "peer-token-test";
const CONSUMER_TOKEN = "consumer-token-test";

const waitFor = async (
  predicate: () => boolean,
  timeoutMs = 5000,
): Promise<void> => {
  const start = Date.now();
  while (!predicate()) {
    if (Date.now() - start > timeoutMs) throw new Error("waitFor timeout");
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
};

async function startUpstream(): Promise<{ port: number; close: () => void }> {
  const server = http.createServer((request, response) => {
    if (request.url?.startsWith("/assets/")) {
      response.writeHead(200, { "content-type": "application/javascript" });
      response.end("console.log('revpi-admin');");
      return;
    }
    response.writeHead(404);
    response.end("not found");
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (address === null || typeof address === "string") {
    throw new Error("upstream port alinamadi");
  }
  return {
    port: address.port,
    close: () => {
      server.close();
    },
  };
}

const config: HubConfig = {
  host: "127.0.0.1",
  port: 0,
  authMode: "env",
  peerToken: PEER_TOKEN,
  consumerToken: CONSUMER_TOKEN,
  dbPath: ":memory:",
  cookieName: "tunnel_session",
  hubId: "hub-test",
  staleTimeoutMs: 45_000,
  sweepIntervalMs: 1_000,
  pathAllowlist: {
    allowedPrefixes: ["/", "/api/", "/ws/", "/assets/", "/favicon"],
    blockedPrefixes: ["/api/auth/login"],
  },
};

describe("hub-servis uçtan uca (gerçek WS + Fastify)", () => {
  it("SC-2/SC-3: register → keşif → opak erişim → relay", async () => {
    const upstream = await startUpstream();
    const composition = await createHub(config);
    await composition.server.listen({ host: "127.0.0.1", port: 0 });
    const hubAddress = composition.server.addresses()[0];
    if (hubAddress === undefined) throw new Error("hub port alinamadi");
    const hubBase = `http://127.0.0.1:${hubAddress.port}`;

    const connector = new TunnelConnector(
      {
        wsUrls: [`ws://127.0.0.1:${hubAddress.port}/ws/peer`],
        token: PEER_TOKEN,
        peerId: "revpi-1",
        peerType: "device",
        services: [{ id: "local-admin" }],
        heartbeatIntervalMs: 500,
        registerTimeoutMs: 3000,
        livenessTimeoutMs: 60_000,
      },
      new WsSocketClientFactory(),
      new ReconnectDelay({
        baseMs: 200,
        maxMs: 1000,
        jitterSpanMs: 0,
        jitter: () => 0,
      }),
    );
    const sessionStore = new ClientSessionStore(
      new JoseSignerForTests("hub-servis-integration-secret-0123456789"),
    );
    const sessionServer = new ClientSessionServer(
      connector,
      sessionStore,
      undefined,
    );
    sessionServer.start();
    const tunnelClient = TunnelClient.create({
      webServiceUrl: `http://127.0.0.1:${upstream.port}`,
      staticUrl: `http://127.0.0.1:${upstream.port}`,
    });
    tunnelClient.attach(connector);

    try {
      await connector.start();
      await waitFor(() => connector.connected());

      const peersResponse = await fetch(`${hubBase}/peers`);
      const peersBody = (await peersResponse.json()) as {
        peers: Array<{ peerId: string; status: string }>;
      };
      expect(peersBody.peers[0]).toMatchObject({
        peerId: "revpi-1",
        status: "connected",
      });

      const servicesResponse = await fetch(
        `${hubBase}/peers/revpi-1/services`,
      );
      expect(await servicesResponse.json()).toEqual({
        services: [{ id: "local-admin" }],
      });

      const accessResponse = await fetch(
        `${hubBase}/peers/revpi-1/services/local-admin/assets/app.js`,
        {
          headers: {
            authorization: `Bearer ${CONSUMER_TOKEN}`,
            "x-tunnel-user-id": "u-1",
            "x-tunnel-user-username": "operator",
            "x-tunnel-user-role": "operator",
          },
        },
      );
      expect(accessResponse.status).toBe(200);
      expect(await accessResponse.text()).toContain("revpi-admin");

      // AK-4.1/AK-4.2: tarayıcı front-door — consumer token ile oturum aç,
      // sonra yalnız cookie ile opak erişim (consumer token YOK).
      const sessionResponse = await fetch(`${hubBase}/sessions`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${CONSUMER_TOKEN}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          peerId: "revpi-1",
          user: { id: "u-1", username: "operator", role: "operator" },
        }),
      });
      expect(sessionResponse.status).toBe(201);
      const sessionBody = (await sessionResponse.json()) as { token: string };
      const cookieAccess = await fetch(
        `${hubBase}/peers/revpi-1/services/local-admin/assets/app.js`,
        { headers: { cookie: `tunnel_session=${sessionBody.token}` } },
      );
      expect(cookieAccess.status).toBe(200);
      expect(await cookieAccess.text()).toContain("revpi-admin");

      // consumer relay: consumer → peer
      const received: unknown[] = [];
      connector.onMessage((message) => received.push(message));
      const controlResponse = await fetch(`${hubBase}/control/revpi-1`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${CONSUMER_TOKEN}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ type: "telemetry-query", queryId: "q-1" }),
      });
      expect(controlResponse.status).toBe(200);
      await waitFor(() => received.length > 0);
      expect(received[0]).toMatchObject({ type: "telemetry-query" });

      // consumer relay: peer → consumer (/ws/consumer)
      const consumerMessages: string[] = [];
      const consumerSocket = new WebSocket(
        `ws://127.0.0.1:${hubAddress.port}/ws/consumer`,
        { headers: { authorization: `Bearer ${CONSUMER_TOKEN}` } },
      );
      await new Promise<void>((resolve, reject) => {
        consumerSocket.once("open", () => resolve());
        consumerSocket.once("error", reject);
      });
      consumerSocket.on("message", (data) =>
        consumerMessages.push(data.toString()),
      );
      connector.sendControl({ type: "event", eventId: "e-1" });
      await waitFor(() => consumerMessages.length > 0);
      const relayed = JSON.parse(consumerMessages[0] ?? "{}");
      expect(relayed.peerId).toBe("revpi-1");
      expect(relayed.message).toMatchObject({ type: "event", eventId: "e-1" });
      consumerSocket.close();
    } finally {
      await connector.stop();
      tunnelClient.stop();
      sessionServer.stop();
      await composition.stop();
      upstream.close();
    }
  }, 20_000);
});
