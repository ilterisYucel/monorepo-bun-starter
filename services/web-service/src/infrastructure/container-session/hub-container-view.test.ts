import { describe, it, expect, vi } from "vitest";
import { HubContainerView } from "./hub-container-view";

type Emit = (peerId: string, message: unknown) => void;

function setup(peers: Array<{ peerId: string; peerType: string; status: string }>) {
  let handler: Emit | undefined;
  const peersFn = vi.fn().mockResolvedValue(peers);
  const sendControl = vi.fn();
  const view = new HubContainerView({
    peers: peersFn,
    sendControl,
    onControlMessage: (cb) => {
      handler = cb as Emit;
      return () => undefined;
    },
    now: () => 1000,
    queryTimeoutMs: 30,
  });
  return { view, peersFn, sendControl, emit: (p: string, m: unknown) => handler?.(p, m) };
}

describe("HubContainerView", () => {
  it("presence: connectionStatus + lastSeenAt hub keşfinden", async () => {
    const { view } = setup([
      { peerId: "c-1", peerType: "container", status: "connected" },
      { peerId: "c-2", peerType: "container", status: "idle" },
    ]);
    await view.start();
    expect(view.connectionStatus().get("c-1")).toBe("connected");
    expect(view.connectionStatus().get("c-2")).toBe("idle");
    expect(view.lastSeenAt("c-1")).toBeDefined();
    expect(view.containerIds()).toEqual(["c-1", "c-2"]);
    await view.stop();
  });

  it("relay telemetry frame'i latestTelemetry'ye yazılır", async () => {
    const { view, emit } = setup([{ peerId: "c-1", peerType: "container", status: "connected" }]);
    await view.start();
    emit("c-1", { type: "telemetry", data: [{ deviceId: "bsc-1", name: "Voltage", value: 750 }] });
    expect(view.latestTelemetry("c-1")).toHaveLength(1);
    await view.stop();
  });

  it("latestQuery telemetry-query gönderir + yanıtı queryId ile eşler", async () => {
    const { view, sendControl, emit } = setup([
      { peerId: "c-1", peerType: "container", status: "connected" },
    ]);
    await view.start();
    const promise = view.latestQuery("c-1");
    const frame = sendControl.mock.calls[0]?.[1] as { type: string; queryId: string; mode: string };
    expect(frame.type).toBe("telemetry-query");
    expect(frame.mode).toBe("latest");
    emit("c-1", {
      type: "telemetry-result",
      queryId: frame.queryId,
      data: [{ deviceId: "bsc-1", name: "Voltage", value: 1 }],
    });
    expect(await promise).toHaveLength(1);
    await view.stop();
  });

  it("historical downsampled mod ile sorgular", async () => {
    const { view, sendControl } = setup([
      { peerId: "c-1", peerType: "container", status: "connected" },
    ]);
    await view.start();
    void view.historical("c-1", { from: new Date(0), to: new Date(1000), points: 60 });
    const frame = sendControl.mock.calls[0]?.[1] as { mode: string; points: number };
    expect(frame.mode).toBe("downsampled");
    expect(frame.points).toBe(60);
    await view.stop();
  });

  it("bağlı olmayan konteyner sorgusu boş döner", async () => {
    const { view } = setup([]);
    await view.start();
    expect(await view.latestQuery("ghost")).toEqual([]);
    await view.stop();
  });
});
