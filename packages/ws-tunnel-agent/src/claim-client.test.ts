import { describe, it, expect, vi } from "vitest";
import { BootstrapClaimClient } from "./claim-client";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("BootstrapClaimClient", () => {
  it("AK-2.1: doğru URL/gövde ile claim eder", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse(200, { peerId: "revpi-1", peerSecret: "peer-secret-1" }),
    );
    const client = new BootstrapClaimClient({ fetchImpl: fetchImpl as never });

    const result = await client.claim("http://hub:5003", "revpi-1", "boot-token");

    expect(result.isOk()).toBe(true);
    if (result.isOk()) expect(result.unwrap().peerSecret).toBe("peer-secret-1");
    const [url, init] = fetchImpl.mock.calls[0]! as unknown as [string, RequestInit];
    expect(url).toBe("http://hub:5003/peers/bootstrap/claim");
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual({
      peerId: "revpi-1",
      bootstrapToken: "boot-token",
    });
  });

  it("AK-2.3: 4xx/ağ hatası fail-closed hata döner", async () => {
    const unauthorized = new BootstrapClaimClient({
      fetchImpl: (async () => jsonResponse(400, { error: "gecersiz" })) as never,
    });
    const rejected = await unauthorized.claim("http://hub", "p", "t");
    expect(rejected.isErr()).toBe(true);
    if (rejected.isErr()) expect(rejected.error()).toContain("400");

    const offline = new BootstrapClaimClient({
      fetchImpl: (async () => {
        throw new Error("ECONNREFUSED");
      }) as never,
    });
    const failed = await offline.claim("http://hub", "p", "t");
    expect(failed.isErr()).toBe(true);
  });

  it("AK-2.4: yanıttaki peerId eşleşmezse reddeder", async () => {
    const client = new BootstrapClaimClient({
      fetchImpl: (async () =>
        jsonResponse(200, { peerId: "baska-peer", peerSecret: "s" })) as never,
    });
    const result = await client.claim("http://hub", "revpi-1", "t");
    expect(result.isErr()).toBe(true);
    if (result.isErr()) expect(result.error()).toContain("peerId");
  });
});
