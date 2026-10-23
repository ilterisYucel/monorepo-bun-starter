import { describe, it, expect, vi } from "vitest";
import { HubConsumerClient, HubConsumerError } from "./hub-consumer-client";

function jsonResponse(data: unknown, ok = true, status = 200): Response {
  return { ok, status, json: async () => data } as unknown as Response;
}

function makeClient(handler: (url: string, init?: RequestInit) => Response) {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, init });
    return handler(url, init);
  }) as unknown as typeof fetch;
  const client = new HubConsumerClient({ baseUrl: "http://hub:5003/", token: "ct", fetchImpl });
  return { client, calls };
}

describe("HubConsumerClient", () => {
  it("AK-1.1: peers() tipli liste döner + auth başlığı taşır", async () => {
    const { client, calls } = makeClient(() =>
      jsonResponse({ peers: [{ peerId: "p-1", peerType: "device", status: "connected", services: [] }] }),
    );
    const peers = await client.peers();
    expect(peers[0]?.peerId).toBe("p-1");
    expect(calls[0]?.url).toBe("http://hub:5003/peers");
    expect((calls[0]?.init?.headers as Record<string, string>).authorization).toBe("Bearer ct");
  });

  it("openSession POST /sessions", async () => {
    const { client, calls } = makeClient(() =>
      jsonResponse({ sessionId: "s-1", token: "jwt", expiresInSec: 3600 }),
    );
    const session = await client.openSession({
      peerId: "p-1",
      user: { id: "u-1", username: "op", role: "operator" },
    });
    expect(session.sessionId).toBe("s-1");
    expect(calls[0]?.url).toBe("http://hub:5003/sessions");
  });

  it("access programatik erişim URL'i kurar", async () => {
    const { client, calls } = makeClient(() => jsonResponse({ ok: true }));
    await client.access({ peerId: "p-1", serviceId: "local-admin", path: "/api/maneuvers/x/execute", method: "POST" });
    expect(calls[0]?.url).toBe(
      "http://hub:5003/peers/p-1/services/local-admin/api/maneuvers/x/execute",
    );
  });

  it("ok olmayan yanıt HubConsumerError fırlatır", async () => {
    const { client } = makeClient(() => jsonResponse({}, false, 503));
    await expect(client.peers()).rejects.toBeInstanceOf(HubConsumerError);
  });

});
