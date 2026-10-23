import { describe, it, expect, vi } from "vitest";
import type { HubConsumerClient } from "../hub-tunnel";
import { HubManeuverChannel } from "./hub-maneuver-channel";

function makeClient(
  response: Response | (() => Promise<Response>),
): HubConsumerClient & { access: ReturnType<typeof vi.fn> } {
  const access = vi.fn().mockImplementation(async () =>
    typeof response === "function" ? response() : response,
  );
  return { access } as unknown as HubConsumerClient & {
    access: ReturnType<typeof vi.fn>;
  };
}

const okResponse = (status: number, json?: unknown): Response =>
  ({
    status,
    json: async () => json,
  }) as unknown as Response;

describe("HubManeuverChannel", () => {
  it("AK-3.1: 200 → ok; doğru yol ve gövde", async () => {
    const client = makeClient(okResponse(200));
    const channel = new HubManeuverChannel({ client, serviceId: "container-api" });
    const result = await channel.execute("c-1", "bsc_prepare", { powerKw: 100 }, { durationSeconds: 30 });
    expect(result).toEqual({ ok: true });
    const call = client.access.mock.calls[0]?.[0];
    expect(call.peerId).toBe("c-1");
    expect(call.serviceId).toBe("container-api");
    expect(call.path).toBe("/api/maneuvers/bsc_prepare/execute");
    expect(call.method).toBe("POST");
    expect(JSON.parse(call.body)).toEqual({
      params: { powerKw: 100 },
      timer: { durationSeconds: 30 },
    });
  });

  it("AK-3.2: 503/404 → system_unreachable", async () => {
    const channel = new HubManeuverChannel({
      client: makeClient(okResponse(503)),
      serviceId: "s",
    });
    expect(await channel.execute("c-1", "m")).toEqual({
      ok: false,
      reason: "system_unreachable",
    });
  });

  it("diğer hatalar → gövdedeki reason", async () => {
    const channel = new HubManeuverChannel({
      client: makeClient(okResponse(500, { error: "interlock_failed" })),
      serviceId: "s",
    });
    expect(await channel.execute("c-1", "m")).toEqual({
      ok: false,
      reason: "interlock_failed",
    });
  });

  it("ağ hatası → system_unreachable", async () => {
    const channel = new HubManeuverChannel({
      client: makeClient(() => Promise.reject(new Error("down"))),
      serviceId: "s",
    });
    expect(await channel.execute("c-1", "m")).toEqual({
      ok: false,
      reason: "system_unreachable",
    });
  });
});
