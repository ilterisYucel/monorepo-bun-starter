import { describe, it, expect } from "vitest";
import { rmSync } from "node:fs";
import {
  ReconnectDelay,
  TunnelConnector,
  WsSocketClientFactory,
} from "@gd-monorepo/ws-tunnel";
import { createHub } from "./main";
import { NodeSqliteDatabase } from "./__test-helpers__/node-sqlite-database";
import type { HubConfig } from "./config/hub-config";

const CONSUMER_TOKEN = "consumer-token-test";

const waitFor = async (
  predicate: () => boolean | Promise<boolean>,
  timeoutMs = 5000,
): Promise<void> => {
  const start = Date.now();
  while (!(await predicate())) {
    if (Date.now() - start > timeoutMs) throw new Error("waitFor timeout");
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
};

function makeConfig(dbPath: string): HubConfig {
  return {
    host: "127.0.0.1",
    port: 0,
    authMode: "sqlite",
    consumerToken: CONSUMER_TOKEN,
    dbPath,
    cookieName: "tunnel_session",
    staleTimeoutMs: 45_000,
    sweepIntervalMs: 1_000,
    pathAllowlist: {
      allowedPrefixes: ["/", "/api/", "/ws/", "/assets/"],
      blockedPrefixes: [],
    },
  };
}

function adminHeaders(): Record<string, string> {
  return {
    authorization: `Bearer ${CONSUMER_TOKEN}`,
    "content-type": "application/json",
  };
}

describe("bootstrap uçtan uca (sqlite)", () => {
  it("AK-4.2: bootstrap → claim → register → revoke", async () => {
    const dbPath = `/tmp/opencode/hub-bootstrap-${Date.now()}-${Math.random()
      .toString(16)
      .slice(2)}.db`;
    const composition = await createHub(makeConfig(dbPath), {
      createDatabase: (path) => new NodeSqliteDatabase(path),
    });
    await composition.server.listen({ host: "127.0.0.1", port: 0 });
    const address = composition.server.addresses()[0];
    if (address === undefined) throw new Error("hub port alinamadi");
    const base = `http://127.0.0.1:${address.port}`;
    const wsUrl = `ws://127.0.0.1:${address.port}/ws/peer`;

    let connector: TunnelConnector | undefined;
    try {
      // 1) admin bootstrap üretir
      const createResponse = await fetch(`${base}/admin/peers`, {
        method: "POST",
        headers: adminHeaders(),
        body: JSON.stringify({ peerId: "revpi-boot" }),
      });
      expect(createResponse.status).toBe(201);
      const issued = (await createResponse.json()) as {
        bootstrapToken: string;
        expiresAt: string;
      };
      expect(issued.bootstrapToken.length).toBeGreaterThan(20);

      // 2) peer claim eder
      const claimResponse = await fetch(`${base}/peers/bootstrap/claim`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          peerId: "revpi-boot",
          bootstrapToken: issued.bootstrapToken,
        }),
      });
      expect(claimResponse.status).toBe(200);
      const claimed = (await claimResponse.json()) as { peerSecret: string };

      // 3) aynı token ikinci kez kullanılamaz
      const reuse = await fetch(`${base}/peers/bootstrap/claim`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          peerId: "revpi-boot",
          bootstrapToken: issued.bootstrapToken,
        }),
      });
      expect(reuse.status).toBe(400);

      // 4) kalıcı secret ile register
      connector = new TunnelConnector(
        {
          wsUrls: [wsUrl],
          token: claimed.peerSecret,
          peerId: "revpi-boot",
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
      await connector.start();
      await waitFor(() => connector!.connected());

      const peers = (await (await fetch(`${base}/peers`)).json()) as {
        peers: Array<{ peerId: string; status: string }>;
      };
      expect(peers.peers[0]).toMatchObject({
        peerId: "revpi-boot",
        status: "connected",
      });

      // 5) revoke → kimlik iptal + bağlantı düşer
      const revokeResponse = await fetch(`${base}/admin/peers/revpi-boot`, {
        method: "DELETE",
        headers: adminHeaders(),
      });
      expect(revokeResponse.status).toBe(200);
      await waitFor(async () => {
        const current = (await (await fetch(`${base}/peers`)).json()) as {
          peers: unknown[];
        };
        return current.peers.length === 0;
      });
      await waitFor(() => !connector!.connected());
    } finally {
      if (connector !== undefined) await connector.stop();
      await composition.stop();
      rmSync(dbPath, { force: true });
    }
  }, 20_000);
});
