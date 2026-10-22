import { describe, it, expect, vi } from "vitest";
import { HubContainerView } from "./hub-container-view";
import type { HubAccessRequest } from "../hub-consumer";

const TELEMETRY = [{ deviceId: "BSC-1", name: "SOC", value: 55, unit: "%" }];
type Peer = { peerId: string; peerType: string; status: string };

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function setup(
  initialPeers: Peer[],
  access?: (request: HubAccessRequest) => Promise<Response>,
) {
  let peers = initialPeers;
  let now = 1000;
  const peersFn = vi.fn(async () => peers);
  const accessFn = vi.fn(access ?? (async () => jsonResponse({ telemetries: TELEMETRY })));
  const view = new HubContainerView({
    peers: peersFn,
    access: accessFn,
    serviceId: "container-api",
    latestCacheTtlMs: 2000,
    queryTimeoutMs: 50,
    now: () => now,
  });
  return {
    view,
    peersFn,
    accessFn,
    setPeers: (next: Peer[]) => {
      peers = next;
    },
    advance: (ms: number) => {
      now += ms;
    },
  };
}

const connected = (peerId = "c-1"): Peer[] => [{ peerId, peerType: "container", status: "connected" }];

describe("HubContainerView — hub relay HTTP", () => {
  it("presence: connectionStatus + lastSeenAt hub keşfinden", async () => {
    const { view } = setup([
      { peerId: "c-1", peerType: "container", status: "connected" },
      { peerId: "c-2", peerType: "container", status: "idle" },
      { peerId: "agent", peerType: "device", status: "connected" },
    ]);
    await view.start();
    expect(view.connectionStatus().get("c-1")).toBe("connected");
    expect(view.connectionStatus().get("c-2")).toBe("idle");
    expect(view.connectionStatus().has("agent")).toBe(false);
    expect(view.lastSeenAt("c-1")).toBeDefined();
    expect(view.containerIds()).toEqual(["c-1", "c-2"]);
    await view.stop();
  });

  it("AK-1.1: latestQuery container'ın generic latest endpoint'ini çağırır", async () => {
    const { view, accessFn } = setup(connected());
    await view.start();
    const data = await view.latestQuery("c-1", { names: ["SOC"] });
    expect(data).toEqual(TELEMETRY);
    const req = accessFn.mock.calls[0]?.[0] as HubAccessRequest;
    expect(req.peerId).toBe("c-1");
    expect(req.serviceId).toBe("container-api");
    expect(req.path).toContain("/api/unified/telemetry/latest-per-name");
    expect(req.path).toContain("names=SOC");
    expect(req.path).toContain("windowMs=");
    expect(req.headers?.["x-tunnel-user-id"]).toBe("system");
    await view.stop();
  });

  it("AK-1.3: TTL içinde ikinci sorgu cache'ten döner", async () => {
    const { view, accessFn, advance } = setup(connected());
    await view.start();
    await view.latestQuery("c-1");
    expect(accessFn).toHaveBeenCalledTimes(1);
    await view.latestQuery("c-1");
    expect(accessFn).toHaveBeenCalledTimes(1);
    advance(2100);
    await view.latestQuery("c-1");
    expect(accessFn).toHaveBeenCalledTimes(2);
    await view.stop();
  });

  it("AK-1.2: historical downsampled endpoint'ini pencereyle çağırır", async () => {
    const { view, accessFn } = setup(connected());
    await view.start();
    await view.historical("c-1", {
      from: new Date("2026-10-22T00:00:00.000Z"),
      to: new Date("2026-10-22T01:00:00.000Z"),
      points: 60,
    });
    const req = accessFn.mock.calls[0]?.[0] as HubAccessRequest;
    expect(req.path).toContain("/api/unified/telemetry/downsampled");
    expect(req.path).toContain("points=60");
    expect(req.path).toContain("from=2026-10-22T00");
    await view.stop();
  });

  it("AK-1.4: erişim hatasında boş dizi; son cache değeri fallback", async () => {
    const { view, accessFn, advance } = setup(connected(), async () => {
      throw new Error("hub down");
    });
    await view.start();
    expect(await view.latestQuery("c-1")).toEqual([]);

    accessFn.mockResolvedValueOnce(jsonResponse({ telemetries: TELEMETRY }));
    expect(await view.latestQuery("c-1")).toEqual(TELEMETRY);
    expect(view.latestTelemetry("c-1")).toEqual(TELEMETRY);

    advance(5000); // TTL geçti
    accessFn.mockRejectedValueOnce(new Error("hub down"));
    expect(await view.latestQuery("c-1")).toEqual(TELEMETRY); // bayat cache fallback
    await view.stop();
  });

  it("bağlı olmayan konteyner sorgusu boş döner", async () => {
    const { view, accessFn } = setup([]);
    await view.start();
    expect(await view.latestQuery("ghost")).toEqual([]);
    expect(accessFn).not.toHaveBeenCalled();
    await view.stop();
  });

  it("yeniden bağlanan peer'ın cache'i geçersizleşir", async () => {
    const { view, accessFn, setPeers } = setup(connected());
    await view.start();
    await view.latestQuery("c-1");
    expect(accessFn).toHaveBeenCalledTimes(1);

    setPeers([{ peerId: "c-1", peerType: "container", status: "idle" }]);
    await view.refresh();
    setPeers(connected());
    await view.refresh();

    // TTL dolmadan yeni sorgu relay'e gitmeli (cache invalidate edildi).
    await view.latestQuery("c-1");
    expect(accessFn).toHaveBeenCalledTimes(2);
    await view.stop();
  });
});
