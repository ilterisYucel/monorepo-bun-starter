import { describe, it, expect, vi } from "vitest";
import Fastify from "fastify";
import { fieldSessionRoutes, fieldTunnelRoutes } from "./field-session-routes";
import type { SessionGateway, TunnelProxy } from "@gd-monorepo/ws-tunnel";

/**
 * field-session-routes sözleşmesi (Faz 3 — boss tier):
 * - POST /:fid/session → 200 + redirectUrl + field_session cookie (Path-scoped)
 * - Gateway hatası → statusForKind eşlemesi (403/503/409)
 * - DELETE /:fid/session → 404 açık oturum yoksa
 * - /fields/:fid/ui/* → cookie'siz 401; allowlist dışı 403
 */

function makeGateway(overrides: Partial<SessionGateway> = {}): SessionGateway {
  return {
    openSession: vi.fn().mockResolvedValue({
      isErr: () => false,
      unwrap: () => ({
        sessionId: "s-1",
        token: "jwt-1",
        expiresInSec: 14400,
        peerRole: "boss",
      }),
    }),
    sessionForPeer: vi.fn().mockReturnValue(undefined),
    closeSession: vi.fn(),
    sessionByToken: vi.fn(),
    initialize: vi.fn(),
    stop: vi.fn(),
    ...overrides,
  } as unknown as SessionGateway;
}

function makeProxy(overrides: Partial<TunnelProxy> = {}): TunnelProxy {
  return {
    authenticate: vi.fn().mockReturnValue(undefined),
    startHttpStream: vi.fn().mockResolvedValue(undefined),
    startWsBridge: vi.fn().mockResolvedValue(undefined),
    sendWsToPeer: vi.fn(),
    closeWs: vi.fn(),
    initialize: vi.fn(),
    stop: vi.fn(),
    ...overrides,
  } as unknown as TunnelProxy;
}

async function buildSessionApp(
  gateway: SessionGateway,
  proxy: TunnelProxy,
): Promise<Fastify.FastifyInstance> {
  const app = Fastify();
  app.addHook("onRequest", (request, _reply, done) => {
    (request as unknown as { user: unknown }).user = {
      id: "u-1",
      username: "boss",
      role: "boss",
      fieldIds: [],
      mustChangePassword: false,
    };
    done();
  });
  await app.register(
    async (fastify) => {
      await fieldSessionRoutes(fastify, { gateway, tunnelProxy: proxy });
    },
    { prefix: "/api/fields" },
  );
  await app.register(async (fastify) => {
    await fieldTunnelRoutes(fastify, { tunnelProxy: proxy });
  });
  return app;
}

describe("field-session-routes (Faz 3)", () => {
  it("POST /:fid/session → 200 + redirectUrl + Path-scoped cookie", async () => {
    const app = await buildSessionApp(makeGateway(), makeProxy());
    const res = await app.inject({
      method: "POST",
      url: "/api/fields/f-1/session",
      headers: { "x-test-user": "boss" },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.redirectUrl).toBe("/fields/f-1/ui/");
    expect(res.headers["set-cookie"]).toContain("field_session=jwt-1");
    expect(res.headers["set-cookie"]).toContain("Path=/fields/f-1/ui");
  });

  it("gateway hatası → 503 (transient)", async () => {
    const gateway = makeGateway({
      openSession: vi.fn().mockResolvedValue({
        isErr: () => true,
        error: () => ({ kind: "transient", message: "kapali" }),
      }),
    });
    const app = await buildSessionApp(gateway, makeProxy());
    const res = await app.inject({
      method: "POST",
      url: "/api/fields/f-1/session",
    });
    expect(res.statusCode).toBe(503);
  });

  it("DELETE /:fid/session → açık oturum yoksa 404", async () => {
    const app = await buildSessionApp(makeGateway(), makeProxy());
    const res = await app.inject({
      method: "DELETE",
      url: "/api/fields/f-1/session",
    });
    expect(res.statusCode).toBe(404);
  });

  it("/fields/:fid/ui/* → cookie'siz 401", async () => {
    const app = await buildSessionApp(makeGateway(), makeProxy());
    const res = await app.inject({ method: "GET", url: "/fields/f-1/ui/" });
    expect(res.statusCode).toBe(401);
  });

  it("/fields/:fid/ui/* → oturumlu ama allowlist dışı 403", async () => {
    const proxy = makeProxy({
      authenticate: vi.fn().mockReturnValue({ sessionId: "s-1", peerId: "f-1" }),
    });
    const app = await buildSessionApp(makeGateway(), proxy);
    const res = await app.inject({
      method: "GET",
      url: "/fields/f-1/ui/etc/passwd",
      headers: { cookie: "field_session=jwt-1" },
    });
    expect(res.statusCode).toBe(403);
  });

  it("FIELD_TUNNEL_ALLOWED_PREFIXES ek önekleri — /src/ gibi dev asset yolu geçer", async () => {
    const proxy = makeProxy({
      authenticate: vi.fn().mockReturnValue({ sessionId: "s-1", peerId: "f-1" }),
      startHttpStream: vi.fn().mockImplementation(
        async (input: {
          method: string;
          path: string;
          raw: import("@gd-monorepo/ws-tunnel").IStreamSink;
        }) => {
          input.raw.status(200, { "content-type": "text/html" });
          input.raw.write(Buffer.from("asset"));
          input.raw.end();
        },
      ),
    });
    const app = Fastify();
    app.addHook("onRequest", (request, _reply, done) => {
      (request as unknown as { user: unknown }).user = {
        id: "u-1",
        username: "boss",
        role: "boss",
        fieldIds: [],
        mustChangePassword: false,
      };
      done();
    });
    await app.register(async (fastify) => {
      await fieldTunnelRoutes(fastify, {
        tunnelProxy: proxy,
        pathAllowlist: {
          allowedPrefixes: ["/", "/api/", "/ws/", "/assets/", "/favicon", "/src/", "/@vite/"],
        },
      });
    });
    await app.ready();

    const ok = await app.inject({
      method: "GET",
      url: "/fields/f-1/ui/src/main.tsx",
      headers: { cookie: "field_session=jwt-1" },
    });
    expect(ok.statusCode).toBe(200);

    // Yasaklılar ek allowlist'ten ETKİLENMEZ — blocklist önceliklidir.
    const blocked = await app.inject({
      method: "GET",
      url: "/fields/f-1/ui/api/auth/login",
      headers: { cookie: "field_session=jwt-1" },
    });
    expect(blocked.statusCode).toBe(403);
  });

  it("/fields/:fid/ui/ws/* → cookie'siz 1008 kapanışı", async () => {
    const app = await buildSessionApp(makeGateway(), makeProxy());
    const res = await app.inject({
      method: "GET",
      url: "/fields/f-1/ui/ws/realtime",
      headers: { upgrade: "websocket", connection: "upgrade" },
    });
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
  });
});
