import { describe, it, expect, vi } from "vitest";
import { HubPeerRegistry } from "@gd-monorepo/ws-tunnel";
import { PeerConnectionTracker } from "../../domain/peer-connection-tracker";
import { AuthenticatePeerToken } from "../../application/authenticate-peer-token";
import { RegisterPeer } from "../../application/register-peer";
import { DisconnectPeer } from "../../application/disconnect-peer";
import { PeerChannelHub } from "./peer-channel-hub";

class FakeSocket {
  readyState = 1;
  readonly sent: string[] = [];
  closed: { code?: number; reason?: string } | undefined;
  private readonly handlers = new Map<string, Array<(...args: unknown[]) => void>>();

  send(data: string | Buffer): void {
    this.sent.push(data.toString());
  }

  close(code?: number, reason?: string): void {
    this.closed = { code, reason };
    this.emit("close");
  }

  on(event: string, callback: (...args: unknown[]) => void): this {
    const list = this.handlers.get(event) ?? [];
    list.push(callback);
    this.handlers.set(event, list);
    return this;
  }

  emit(event: string, ...args: unknown[]): void {
    for (const callback of this.handlers.get(event) ?? []) callback(...args);
  }

  /** Test yardımcısı — Fastify ws imzasına uygun cast. */
  asSocket() {
    return this as unknown as import("ws").WebSocket;
  }
}

function setup(authenticated = true) {
  const registry = new HubPeerRegistry();
  const tracker = new PeerConnectionTracker({ staleTimeoutMs: 60_000 }, () => 0);
  const registerPeer = new RegisterPeer(
    registry,
    tracker,
    new AuthenticatePeerToken({
      authenticate: vi.fn().mockResolvedValue(authenticated),
    }),
  );
  const disconnectPeer = new DisconnectPeer(registry, tracker);
  const publish = vi.fn();
  const hub = new PeerChannelHub({
    registry,
    tracker,
    registerPeer,
    disconnectPeer,
    consumerRelay: { publish },
    sweepIntervalMs: 60_000,
  });
  return { hub, registry, tracker, publish };
}

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("PeerChannelHub", () => {
  it("AK-1.3: geçerli register → ok ack + registry/tracker", async () => {
    const { hub, registry, tracker } = setup();
    const socket = new FakeSocket();
    hub.accept(socket.asSocket(), "t");
    socket.emit(
      "message",
      Buffer.from(
        JSON.stringify({
          type: "register",
          peerId: "p-1",
          peerType: "device",
          services: [{ id: "local-admin" }],
        }),
      ),
      false,
    );
    await tick();
    expect(JSON.parse(socket.sent[0] ?? "{}").status).toBe("ok");
    expect(registry.servicesOf("p-1")).toEqual([{ id: "local-admin" }]);
    expect(tracker.isConnected("p-1")).toBe(true);
    expect(hub.isConnected("p-1")).toBe(true);
    hub.stop();
  });

  it("AK-1.1: geçersiz token → rejected + kapanış", async () => {
    const { hub, registry } = setup(false);
    const socket = new FakeSocket();
    hub.accept(socket.asSocket(), "bad");
    socket.emit(
      "message",
      Buffer.from(
        JSON.stringify({ type: "register", peerId: "p-1", peerType: "device" }),
      ),
      false,
    );
    await tick();
    expect(JSON.parse(socket.sent[0] ?? "{}").status).toBe("rejected");
    expect(socket.closed?.code).toBe(1008);
    expect(registry.peers()).toEqual([]);
    hub.stop();
  });

  it("AK-4.3: bilinmeyen kontrol mesajı consumer portuna akar", async () => {
    const { hub, publish } = setup();
    const socket = new FakeSocket();
    hub.accept(socket.asSocket(), "t");
    socket.emit(
      "message",
      Buffer.from(
        JSON.stringify({ type: "register", peerId: "p-1", peerType: "device" }),
      ),
      false,
    );
    await tick();
    const event = { type: "event", eventId: "e-1" };
    socket.emit("message", Buffer.from(JSON.stringify(event)), false);
    expect(publish).toHaveBeenCalledWith("p-1", event);
    hub.stop();
  });

  it("kapanış → kayıt düşer", async () => {
    const { hub, registry } = setup();
    const socket = new FakeSocket();
    hub.accept(socket.asSocket(), "t");
    socket.emit(
      "message",
      Buffer.from(
        JSON.stringify({ type: "register", peerId: "p-1", peerType: "device" }),
      ),
      false,
    );
    await tick();
    socket.close(1000, "bye");
    expect(registry.peers()).toEqual([]);
    expect(hub.isConnected("p-1")).toBe(false);
    hub.stop();
  });
});
