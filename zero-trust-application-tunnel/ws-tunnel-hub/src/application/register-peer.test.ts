import { describe, it, expect, vi } from "vitest";
import { HubPeerRegistry } from "@gd-monorepo/ws-tunnel";
import { PeerConnectionTracker } from "../domain/peer-connection-tracker";
import { AuthenticatePeerToken } from "./authenticate-peer-token";
import { RegisterPeer } from "./register-peer";

function setup(authenticated = true) {
  const registry = new HubPeerRegistry();
  const tracker = new PeerConnectionTracker({ staleTimeoutMs: 1000 }, () => 0);
  const auth = new AuthenticatePeerToken({
    authenticate: vi.fn().mockResolvedValue(authenticated),
  });
  return { registry, tracker, registerPeer: new RegisterPeer(registry, tracker, auth) };
}

describe("RegisterPeer", () => {
  it("AK-1.1: geçersiz token → Forbidden, kayıt yok", async () => {
    const { registry, registerPeer } = setup(false);
    const result = await registerPeer.execute({
      token: "bad",
      peerId: "p-1",
      peerType: "device",
    });
    expect(result.isErr()).toBe(true);
    expect(result.error().kind).toBe("forbidden");
    expect(registry.peers()).toEqual([]);
  });

  it("AK-1.2: opak olmayan servis duyurusu reddedilir", async () => {
    const { registry, registerPeer } = setup();
    const result = await registerPeer.execute({
      token: "t",
      peerId: "p-1",
      peerType: "device",
      services: [{ id: "x", target: "http://10.0.0.5" }],
    });
    expect(result.isErr()).toBe(true);
    expect(result.error().kind).toBe("validation");
    expect(registry.peers()).toEqual([]);
  });

  it("AK-1.3: geçerli register → registry + tracker", async () => {
    const { registry, tracker, registerPeer } = setup();
    const result = await registerPeer.execute({
      token: "t",
      peerId: "p-1",
      peerType: "device",
      services: [{ id: "local-admin" }],
    });
    expect(result.isOk()).toBe(true);
    expect(registry.servicesOf("p-1")).toEqual([{ id: "local-admin" }]);
    expect(tracker.isConnected("p-1")).toBe(true);
  });

  it("geçersiz peerType reddedilir", async () => {
    const { registerPeer } = setup();
    const result = await registerPeer.execute({
      token: "t",
      peerId: "p-1",
      peerType: "nope",
    });
    expect(result.isErr()).toBe(true);
    expect(result.error().kind).toBe("validation");
  });

  it("AK-1.4: yeniden register servis listesini değiştirir", async () => {
    const { registry, registerPeer } = setup();
    await registerPeer.execute({
      token: "t",
      peerId: "p-1",
      peerType: "device",
      services: [{ id: "A" }],
    });
    await registerPeer.execute({
      token: "t",
      peerId: "p-1",
      peerType: "device",
      services: [{ id: "B" }],
    });
    expect(registry.servicesOf("p-1")).toEqual([{ id: "B" }]);
  });
});
