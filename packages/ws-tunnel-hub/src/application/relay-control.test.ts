import { describe, it, expect, vi } from "vitest";
import { HubPeerRegistry } from "@gd-monorepo/ws-tunnel";
import type { IHubChannel } from "@gd-monorepo/ws-tunnel";
import { RelayControl } from "./relay-control";

function makeChannel(connected = true): IHubChannel & { sendControl: ReturnType<typeof vi.fn> } {
  const sendControl = vi.fn();
  return {
    sendControl,
    sendBinary: vi.fn(),
    onControlMessage: vi.fn(),
    onBinaryFrame: vi.fn(),
    isConnected: vi.fn(() => connected),
  } as unknown as IHubChannel & { sendControl: ReturnType<typeof vi.fn> };
}

function setup(connected = true) {
  const registry = new HubPeerRegistry();
  registry.register({ peerId: "p-1", peerType: "device", services: [] });
  const channel = makeChannel(connected);
  const publish = vi.fn();
  const relay = new RelayControl(channel, registry, { publish });
  return { channel, publish, relay };
}

describe("RelayControl", () => {
  it("AK-4.2: bilinmeyen peer → not_found", () => {
    const { relay } = setup();
    const result = relay.send("ghost", { type: "x" });
    expect(result.isErr()).toBe(true);
    expect(result.error().kind).toBe("not_found");
  });

  it("AK-4.2: bağlı olmayan peer → transient", () => {
    const { relay } = setup(false);
    const result = relay.send("p-1", { type: "x" });
    expect(result.isErr()).toBe(true);
    expect(result.error().kind).toBe("transient");
  });

  it("AK-4.2: bağlı peer → kontrol mesajı opak iletilir", () => {
    const { relay, channel } = setup();
    const message = { type: "telemetry-query", queryId: "q-1" };
    const result = relay.send("p-1", message);
    expect(result.isOk()).toBe(true);
    expect(channel.sendControl).toHaveBeenCalledWith("p-1", message);
  });

  it("AK-4.3: peer'dan gelen mesaj consumer portuna opak akar", () => {
    const { relay, publish } = setup();
    const message = { type: "event", eventId: "e-1" };
    relay.deliver("p-1", message);
    expect(publish).toHaveBeenCalledWith("p-1", message);
  });
});
