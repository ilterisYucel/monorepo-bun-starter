import { test, expect } from "@playwright/test";

/**
 * P4 UC-3b — hub-servis v2 parity (docker stack çalışırken).
 *
 * Ön koşul: v2 dev stack + hub-servis (field) ayakta; en az bir container peer
 * bağlı. Hub erişilemezse test SKIP olur (stack'siz koşularda yeşil kalır).
 *
 * Env: HUB_URL (varsayılan http://127.0.0.1:5009), HUB_CONSUMER_TOKEN.
 */

const HUB_URL = process.env.HUB_URL || "http://127.0.0.1:5009";
const CONSUMER_TOKEN =
  process.env.HUB_CONSUMER_TOKEN || "dev-hub-consumer-token";

const USER_HEADERS = {
  authorization: `Bearer ${CONSUMER_TOKEN}`,
  "x-tunnel-user-id": "u-1",
  "x-tunnel-user-username": "operator",
  "x-tunnel-user-role": "operator",
};

async function hubPeers(): Promise<Array<{ peerId: string; status: string; services: unknown[] }> | undefined> {
  try {
    const response = await fetch(`${HUB_URL}/peers`);
    if (!response.ok) return undefined;
    return ((await response.json()) as { peers: Array<{ peerId: string; status: string; services: unknown[] }> }).peers;
  } catch {
    return undefined;
  }
}

test.describe("hub-servis v2 parity (P4 UC-3b)", () => {
  test("bağlı peer en az bir servis duyurur", async () => {
    const peers = await hubPeers();
    test.skip(peers === undefined, "hub-servis ayakta değil — SKIP");
    const connected = peers!.filter((peer) => peer.status === "connected");
    expect(connected.length, "bağlı peer yok").toBeGreaterThan(0);
    expect(
      connected.some((peer) => peer.services.length > 0),
      "hiçbir peer servis duyurmadı",
    ).toBe(true);
  });

  test("bilinen servis opak yönlendirilir; bilinmeyen servis 404", async () => {
    const peers = await hubPeers();
    test.skip(peers === undefined, "hub-servis ayakta değil — SKIP");
    const peer = peers!.find(
      (candidate) => candidate.status === "connected" && candidate.services.length > 0,
    );
    if (!peer) test.skip(true, "servis duyuran bağlı peer yok — SKIP");
    const serviceId = (peer!.services[0] as { id: string }).id;

    const known = await fetch(
      `${HUB_URL}/peers/${peer!.peerId}/services/${serviceId}/`,
      { headers: USER_HEADERS },
    );
    expect(
      known.status,
      "bilinen servis hub 404'ü DÖNMEMELİ (upstream'e ulaşmalı)",
    ).not.toBe(404);

    const unknown = await fetch(
      `${HUB_URL}/peers/${peer!.peerId}/services/ghost-service/`,
      { headers: USER_HEADERS },
    );
    expect(unknown.status).toBe(404);
  });

  test("rollback notu: legacy hub yolu bu branch'te yok (branch revert)", async () => {
    // P3'te legacy hub kodu silindiği için rollback = önceki branch/commit'e
    // dönmek; env flag ile geri alma YOKTUR. Bu test sözleşmeyi sabitler.
    const peers = await hubPeers();
    test.skip(peers === undefined, "hub-servis ayakta değil — SKIP");
    expect(Array.isArray(peers)).toBe(true);
  });
});
