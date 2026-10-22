import { describe, it, expect, vi } from "vitest";
import type { HubConsumerClient } from "./hub-consumer-client";
import { HubFieldRegistry } from "./hub-field-registry";

function makeClient(peers: unknown[] = []) {
  return {
    peers: vi.fn().mockResolvedValue(peers),
    createPeer: vi.fn().mockResolvedValue({
      peerId: "f-1",
      bootstrapToken: "bt-1",
      expiresAt: "2026-10-17T00:00:00Z",
    }),
    revokePeer: vi.fn().mockResolvedValue(undefined),
  } as unknown as HubConsumerClient & {
    peers: ReturnType<typeof vi.fn>;
    createPeer: ReturnType<typeof vi.fn>;
    revokePeer: ReturnType<typeof vi.fn>;
  };
}

describe("HubFieldRegistry", () => {
  it("AK-2.3: presence hub keşfinden tazelenir", async () => {
    const client = makeClient([
      { peerId: "f-1", status: "connected" },
      { peerId: "f-2", status: "idle" },
    ]);
    const registry = new HubFieldRegistry({ client });
    await registry.refresh();
    expect(registry.isConnected("f-1")).toBe(true);
    expect(registry.isConnected("f-2")).toBe(false);
    expect(registry.lastSeenAt("f-1")).toBeDefined();
  });

  it("upsertToken hub bootstrap üretir (düz metin token döner)", async () => {
    const client = makeClient();
    const registry = new HubFieldRegistry({ client });
    const issued = await registry.upsertToken("f-1", "eski-token-yok-sayilir");
    expect(issued.bootstrapToken).toBe("bt-1");
    expect(client.createPeer).toHaveBeenCalledWith("f-1");
  });

  it("removeToken hub'da iptal eder + presence düşer", async () => {
    const client = makeClient([{ peerId: "f-1", status: "connected" }]);
    const registry = new HubFieldRegistry({ client });
    await registry.refresh();
    await registry.removeToken("f-1");
    expect(client.revokePeer).toHaveBeenCalledWith("f-1");
    expect(registry.isConnected("f-1")).toBe(false);
  });

  it("hub erişilemezse eski presence korunur (kademeli bozulma)", async () => {
    const client = makeClient([{ peerId: "f-1", status: "connected" }]);
    const registry = new HubFieldRegistry({ client });
    await registry.refresh();
    client.peers.mockRejectedValueOnce(new Error("down"));
    await registry.refresh();
    expect(registry.isConnected("f-1")).toBe(true);
  });
});
