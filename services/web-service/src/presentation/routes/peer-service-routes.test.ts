import { describe, it, expect, vi } from "vitest";
import Fastify from "fastify";
import type { SessionGateway, TunnelProxy, IStreamSink } from "@gd-monorepo/ws-tunnel";
import { peerServiceRoutes } from "./peer-service-routes";
import type { FieldRegistry } from "../../infrastructure/field-uplink/field-registry";

/**
 * peer-service-routes sözleşmesi (WS-TUNNEL-OPAK-SERVIS-ERISIMI §6.2):
 * - AK-2.2: GET /peers → id/type/status/services
 * - AK-2.3: GET /peers/:id/services → servis listesi; bilinmeyen peer 404
 * - AK-2.5: /peers/:pid/services/:sid/* → opak proxy (startHttpStream)
 * - AK-2.6: bağlı olmayan peer → 503 (stream açılmaz)
 * - AK-2.7: duyurulmamış servis → 404
 */

const SESSION = {
  sessionId: "s-1",
  peerId: "revpi-1",
  token: "jwt-1",
  user: { id: "u-1", username: "op", role: "operator" },
  peerRole: "operator",
  createdAt: 0,
  lastActivityAt: 0,
  bytesIn: 0,
  bytesOut: 0,
};

function makeRegistry(opts: {
  peers: Array<{ peerId: string; peerType: string; services: Array<{ id: string }> }>;
  connected: string[];
}): FieldRegistry {
  const records = opts.peers.map((p) => ({ ...p, services: p.services }));
  return {
    peers: () => records,
    servicesOf: (peerId: string) =>
      records.find((p) => p.peerId === peerId)?.services ?? [],
    isConnected: (peerId: string) => opts.connected.includes(peerId),
    connectionStatus: () =>
      new Map(records.map((p) => [p.peerId, opts.connected.includes(p.peerId) ? "connected" : "idle"])),
  } as unknown as FieldRegistry;
}

function makeGateway(withSession = true): SessionGateway {
  return {
    sessionForPeer: vi.fn().mockReturnValue(withSession ? SESSION : undefined),
    openSession: vi.fn().mockResolvedValue({
      isErr: () => false,
      unwrap: () => ({ sessionId: "s-1", token: "jwt-1", expiresInSec: 14400, peerRole: "operator" }),
    }),
  } as unknown as SessionGateway;
}

function makeProxy(): TunnelProxy {
  return {
    startHttpStream: vi.fn().mockImplementation(async (input: { raw: IStreamSink }) => {
      input.raw.status(200, { "content-type": "text/html" });
      input.raw.write(Buffer.from("<html>revpi</html>"));
      input.raw.end();
    }),
  } as unknown as TunnelProxy;
}

async function buildApp(
  registry: FieldRegistry,
  proxy: TunnelProxy,
  gateway = makeGateway(),
  pathAllowlist?: { allowedPrefixes: string[] },
): Promise<Fastify.FastifyInstance> {
  const app = Fastify();
  app.addHook("onRequest", (request, _reply, done) => {
    (request as unknown as { user: unknown }).user = {
      id: "u-1",
      username: "op",
      role: "operator",
      fieldIds: [],
      mustChangePassword: false,
    };
    done();
  });
  await app.register(async (fastify) => {
    await peerServiceRoutes(fastify, {
      registry,
      gateway,
      tunnelProxy: proxy,
      pathAllowlist,
    });
  });
  await app.ready();
  return app;
}

describe("peer-service-routes (T14)", () => {
  it("AK-2.2: GET /peers peer'ları id/type/status/services ile listeler", async () => {
    const registry = makeRegistry({
      peers: [{ peerId: "revpi-1", peerType: "device", services: [{ id: "local-admin" }] }],
      connected: ["revpi-1"],
    });
    const app = await buildApp(registry, makeProxy());
    const res = await app.inject({ method: "GET", url: "/peers" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      peers: [
        {
          peerId: "revpi-1",
          peerType: "device",
          status: "connected",
          services: [{ id: "local-admin" }],
        },
      ],
    });
  });

  it("AK-2.3: GET /peers/:id/services servisleri döner", async () => {
    const registry = makeRegistry({
      peers: [{ peerId: "revpi-1", peerType: "device", services: [{ id: "local-admin" }] }],
      connected: ["revpi-1"],
    });
    const app = await buildApp(registry, makeProxy());
    const res = await app.inject({ method: "GET", url: "/peers/revpi-1/services" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ services: [{ id: "local-admin" }] });
  });

  it("AK-2.3: bilinmeyen peer → 404", async () => {
    const registry = makeRegistry({ peers: [], connected: [] });
    const app = await buildApp(registry, makeProxy());
    const res = await app.inject({ method: "GET", url: "/peers/yok/services" });
    expect(res.statusCode).toBe(404);
  });

  it("AK-2.5: duyurulmuş servis + bağlı peer → opak proxy yanıtı akar", async () => {
    const registry = makeRegistry({
      peers: [{ peerId: "revpi-1", peerType: "device", services: [{ id: "local-admin" }] }],
      connected: ["revpi-1"],
    });
    const proxy = makeProxy();
    const app = await buildApp(registry, proxy, makeGateway(), {
      allowedPrefixes: ["/", "/assets/", "/api/", "/ws/"],
    });
    const res = await app.inject({
      method: "GET",
      url: "/peers/revpi-1/services/local-admin/assets/app.js",
    });
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain("revpi");
    const call = (proxy.startHttpStream as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.path).toBe("/assets/app.js");
    expect(call.method).toBe("GET");
  });

  it("AK-2.5: allowlist dışı yol → 403 (stream açılmaz)", async () => {
    const registry = makeRegistry({
      peers: [{ peerId: "revpi-1", peerType: "device", services: [{ id: "local-admin" }] }],
      connected: ["revpi-1"],
    });
    const proxy = makeProxy();
    const app = await buildApp(registry, proxy);
    const res = await app.inject({
      method: "GET",
      url: "/peers/revpi-1/services/local-admin/secret",
    });
    expect(res.statusCode).toBe(403);
    expect(proxy.startHttpStream).not.toHaveBeenCalled();
  });

  it("AK-2.6: bağlı olmayan peer → 503", async () => {
    const registry = makeRegistry({
      peers: [{ peerId: "revpi-1", peerType: "device", services: [{ id: "local-admin" }] }],
      connected: [],
    });
    const proxy = makeProxy();
    const app = await buildApp(registry, proxy);
    const res = await app.inject({
      method: "GET",
      url: "/peers/revpi-1/services/local-admin/",
    });
    expect(res.statusCode).toBe(503);
    expect(proxy.startHttpStream).not.toHaveBeenCalled();
  });

  it("AK-2.7: duyurulmamış servis → 404", async () => {
    const registry = makeRegistry({
      peers: [{ peerId: "revpi-1", peerType: "device", services: [{ id: "local-admin" }] }],
      connected: ["revpi-1"],
    });
    const app = await buildApp(registry, makeProxy());
    const res = await app.inject({
      method: "GET",
      url: "/peers/revpi-1/services/ghost/",
    });
    expect(res.statusCode).toBe(404);
  });

  it("AK-2.6: oturum yoksa akışlı erişimde 401 (kimlik gerekli)", async () => {
    const registry = makeRegistry({
      peers: [{ peerId: "revpi-1", peerType: "device", services: [{ id: "local-admin" }] }],
      connected: ["revpi-1"],
    });
    const gateway = makeGateway(false);
    (gateway.openSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      isErr: () => true,
      error: () => ({ kind: "unauthorized", message: "rol yok" }),
    });
    const app = await buildApp(registry, makeProxy(), gateway, {
      allowedPrefixes: ["/"],
    });
    // oturum yok + openSession hata → statusForKind(unauthorized) = 401
    const res = await app.inject({
      method: "GET",
      url: "/peers/revpi-1/services/local-admin/",
    });
    expect(res.statusCode).toBe(401);
  });
});
