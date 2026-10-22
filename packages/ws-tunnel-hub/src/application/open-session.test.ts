import { describe, it, expect, vi } from "vitest";
import { HubPeerRegistry, Result } from "@gd-monorepo/ws-tunnel";
import type { SessionGateway } from "@gd-monorepo/ws-tunnel";
import { PeerConnectionTracker } from "../domain/peer-connection-tracker";
import { OpenSession } from "./open-session";

function setup(connected = true) {
  const registry = new HubPeerRegistry();
  registry.register({ peerId: "p-1", peerType: "device", services: [{ id: "ui" }] });
  const tracker = new PeerConnectionTracker({ staleTimeoutMs: 1000 }, () => 0);
  if (connected) tracker.markConnected("p-1");
  const gateway = {
    openSession: vi.fn().mockResolvedValue(
      Result.ok({
        sessionId: "s-1",
        token: "jwt-1",
        expiresInSec: 3600,
        peerRole: "admin",
      }),
    ),
  } as unknown as SessionGateway;
  return { registry, tracker, gateway };
}

const user = { id: "u-1", username: "op", role: "operator" };

describe("OpenSession", () => {
  it("AK-4.1: bağlı peer için oturum açar", async () => {
    const { registry, tracker, gateway } = setup();
    const useCase = new OpenSession(registry, tracker, gateway, { hubId: "hub-1" });
    const result = await useCase.execute({ peerId: "p-1", user });
    expect(result.isOk()).toBe(true);
    expect(result.unwrap()).toEqual({
      sessionId: "s-1",
      token: "jwt-1",
      expiresInSec: 3600,
    });
    expect(gateway.openSession).toHaveBeenCalledWith({
      hubId: "hub-1",
      peerId: "p-1",
      user,
      remoteIp: undefined,
    });
  });

  it("bilinmeyen peer → not_found", async () => {
    const { registry, tracker, gateway } = setup();
    const result = await new OpenSession(registry, tracker, gateway).execute({
      peerId: "ghost",
      user,
    });
    expect(result.isErr()).toBe(true);
    expect(result.error().kind).toBe("not_found");
  });

  it("bağlı olmayan peer → transient", async () => {
    const { registry, tracker, gateway } = setup(false);
    const result = await new OpenSession(registry, tracker, gateway).execute({
      peerId: "p-1",
      user,
    });
    expect(result.isErr()).toBe(true);
    expect(result.error().kind).toBe("transient");
  });
});
