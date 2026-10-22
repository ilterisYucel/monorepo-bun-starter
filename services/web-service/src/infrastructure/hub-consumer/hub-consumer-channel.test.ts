import { describe, it, expect, vi } from "vitest";
import type { HubConsumerClient } from "./hub-consumer-client";
import type { ConsumerRelay } from "./consumer-relay";
import { HubConsumerChannel } from "./hub-consumer-channel";

function makeClient(peers: unknown[] = []): HubConsumerClient & {
  peers: ReturnType<typeof vi.fn>;
  sendControl: ReturnType<typeof vi.fn>;
} {
  return {
    peers: vi.fn().mockResolvedValue(peers),
    sendControl: vi.fn().mockResolvedValue(undefined),
  } as unknown as HubConsumerClient & {
    peers: ReturnType<typeof vi.fn>;
    sendControl: ReturnType<typeof vi.fn>;
  };
}

function makeRelay(): ConsumerRelay & {
  start: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
  onMessage: ReturnType<typeof vi.fn>;
} {
  return {
    start: vi.fn(),
    stop: vi.fn(),
    onMessage: vi.fn().mockReturnValue(() => {}),
  } as unknown as ConsumerRelay & {
    start: ReturnType<typeof vi.fn>;
    stop: ReturnType<typeof vi.fn>;
    onMessage: ReturnType<typeof vi.fn>;
  };
}

describe("HubConsumerChannel", () => {
  it("sendControl → client.sendControl", () => {
    const client = makeClient();
    const channel = new HubConsumerChannel(client, makeRelay());
    channel.sendControl("p-1", { type: "x" });
    expect(client.sendControl).toHaveBeenCalledWith("p-1", { type: "x" });
  });

  it("onControlMessage relay aboneliğine delege eder", () => {
    const relay = makeRelay();
    const channel = new HubConsumerChannel(makeClient(), relay);
    const handler = (): void => {};
    channel.onControlMessage(handler);
    expect(relay.onMessage).toHaveBeenCalledWith(handler);
  });

  it("presence tazelenince isConnected doğru döner", async () => {
    const client = makeClient([
      { peerId: "p-1", status: "connected" },
      { peerId: "p-2", status: "idle" },
    ]);
    const channel = new HubConsumerChannel(client, makeRelay());
    await channel.refreshPresence();
    expect(channel.isConnected("p-1")).toBe(true);
    expect(channel.isConnected("p-2")).toBe(false);
  });

  it("sendBinary desteklenmiyor", () => {
    const channel = new HubConsumerChannel(makeClient(), makeRelay());
    expect(() => channel.sendBinary()).toThrow();
  });
});
