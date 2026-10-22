import { describe, it, expect, vi } from "vitest";
import { HubPeerRegistry, Result } from "@gd-monorepo/ws-tunnel";
import type { HubSession, SessionGateway } from "@gd-monorepo/ws-tunnel";
import { PeerConnectionTracker } from "../domain/peer-connection-tracker";
import { OpenServiceAccess } from "./open-service-access";

const SESSION = {
  sessionId: "s-1",
  peerId: "p-1",
  token: "jwt-1",
  user: { id: "u-1", username: "op", role: "operator" },
  peerRole: "operator",
  createdAt: 0,
  lastActivityAt: 0,
  bytesIn: 0,
  bytesOut: 0,
} as HubSession;

function setup(opts: { connected?: boolean; services?: string[]; session?: boolean } = {}) {
  const registry = new HubPeerRegistry();
  registry.register({
    peerId: "p-1",
    peerType: "device",
    services: (opts.services ?? ["local-admin"]).map((id) => ({ id })),
  });
  const tracker = new PeerConnectionTracker({ staleTimeoutMs: 1000 }, () => 0);
  if (opts.connected !== false) tracker.markConnected("p-1");

  let current: HubSession | undefined = opts.session ? SESSION : undefined;
  const gateway = {
    sessionForPeer: vi.fn(() => current),
    openSession: vi.fn(async () => {
      current = SESSION;
      return Result.ok({
        sessionId: SESSION.sessionId,
        token: SESSION.token,
        expiresInSec: 3600,
        peerRole: SESSION.peerRole,
      });
    }),
  } as unknown as SessionGateway;

  const access = new OpenServiceAccess(registry, tracker, gateway, {
    hubId: "hub-1",
    pathAllowlist: { allowedPrefixes: ["/", "/assets/"], blockedPrefixes: ["/api/auth/"] },
  });
  return { access, gateway };
}

const user = { id: "u-1", username: "op", role: "operator" };

describe("OpenServiceAccess", () => {
  it("AK-3.1: duyurulmamış servis → not_found", async () => {
    const { access } = setup();
    const result = await access.authorize({
      peerId: "p-1",
      serviceId: "ghost",
      path: "/",
      user,
    });
    expect(result.isErr()).toBe(true);
    expect(result.error().kind).toBe("not_found");
  });

  it("AK-3.1: bağlı olmayan peer → transient", async () => {
    const { access } = setup({ connected: false });
    const result = await access.authorize({
      peerId: "p-1",
      serviceId: "local-admin",
      path: "/",
      user,
    });
    expect(result.isErr()).toBe(true);
    expect(result.error().kind).toBe("transient");
  });

  it("AK-3.3: allowlist dışı → forbidden", async () => {
    const { access, gateway } = setup();
    const result = await access.authorize({
      peerId: "p-1",
      serviceId: "local-admin",
      path: "/api/auth/login",
      user,
    });
    expect(result.isErr()).toBe(true);
    expect(result.error().kind).toBe("forbidden");
    expect(gateway.openSession).not.toHaveBeenCalled();
  });

  it("AK-3.2: oturum yoksa açar, varsa yeniden kullanır", async () => {
    const { access, gateway } = setup();
    const first = await access.authorize({
      peerId: "p-1",
      serviceId: "local-admin",
      path: "/assets/app.js",
      user,
    });
    expect(first.isOk()).toBe(true);
    expect(gateway.openSession).toHaveBeenCalledTimes(1);

    const second = await access.authorize({
      peerId: "p-1",
      serviceId: "local-admin",
      path: "/assets/app.js",
      user,
    });
    expect(second.isOk()).toBe(true);
    expect(gateway.openSession).toHaveBeenCalledTimes(1);
  });

  it("A2 kök-montaj: allowlist dışı path serbest, blocklist yine kapalı", async () => {
    const { access } = setup();
    const allowed = await access.authorize({
      peerId: "p-1",
      serviceId: "local-admin",
      path: "/cockpit-revpi/cockpit/static/login.js",
      user,
      rootMount: true,
    });
    expect(allowed.isOk()).toBe(true);

    const blocked = await access.authorize({
      peerId: "p-1",
      serviceId: "local-admin",
      path: "/api/auth/login",
      user,
      rootMount: true,
    });
    expect(blocked.isErr()).toBe(true);
    expect(blocked.error().kind).toBe("forbidden");
  });
});
