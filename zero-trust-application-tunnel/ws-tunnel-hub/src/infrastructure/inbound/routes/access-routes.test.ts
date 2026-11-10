import { describe, it, expect, vi } from "vitest";
import Fastify from "fastify";
import websocket from "@fastify/websocket";
import { Result } from "@gd-monorepo/ws-tunnel";
import type { IStreamSink, HubSession, TunnelProxy } from "@gd-monorepo/ws-tunnel";
import type { OpenServiceAccess } from "../../../application/open-service-access";
import type { AuthenticateConsumerToken } from "../../../application/authenticate-consumer-token";
import { accessRoutes, sessionRejectReason } from "./access-routes";

const SESSION = {
  sessionId: "s-1",
  peerId: "c-1",
  token: "peer-jwt-1",
  user: { id: "system", username: "system", role: "admin" },
  peerRole: "admin",
  createdAt: 0,
  lastActivityAt: 0,
  bytesIn: 0,
  bytesOut: 0,
} as HubSession;

async function buildApp(
  peerSessionCookie?: string,
  hostMap?: ReadonlyMap<string, { peerId: string; serviceId: string }>,
  options: { cookieSession?: boolean } = {},
) {  const captured: { headers: Record<string, string> }[] = [];
  const authorized: { peerId: string; serviceId: string; path: string }[] = [];
  const capturedWs: { headers?: Record<string, string> }[] = [];
  const openAccess = {
    authorize: vi.fn().mockImplementation(
      async (input: { peerId: string; serviceId: string; path: string }) => {
        authorized.push(input);
        return Result.ok({ session: SESSION, path: input.path });
      },
    ),
  } as unknown as OpenServiceAccess;
  const tunnelProxy = {
    authenticate: vi
      .fn()
      .mockReturnValue(options.cookieSession ? SESSION : undefined),
    startHttpStream: vi.fn().mockImplementation(
      async (input: { raw: IStreamSink; headers: Record<string, string> }) => {
        captured.push({ headers: input.headers });
        input.raw.status(200, { "content-type": "text/plain" });
        input.raw.write(Buffer.from("ok"));
        input.raw.end();
      },
    ),
    startWsBridge: vi.fn().mockImplementation(async (input: { headers?: Record<string, string> }) => {
      capturedWs.push({ headers: input.headers });
      return 1;
    }),
  } as unknown as TunnelProxy;
  const authenticateConsumer = {
    execute: vi.fn().mockReturnValue(true),
  } as unknown as AuthenticateConsumerToken;

  const app = Fastify();
  await app.register(websocket);
  await app.register(async (fastify) => {
    accessRoutes(fastify, {
      openAccess,
      tunnelProxy,
      authenticateConsumer,
      peerSessionCookie,
      hostMap,
      cookieName: "tunnel_session",
    });
  });
  await app.ready();
  return { app, captured, authorized, capturedWs };
}

const USER_HEADERS = {
  authorization: "Bearer ct",
  "x-tunnel-user-id": "system",
  "x-tunnel-user-username": "system",
  "x-tunnel-user-role": "admin",
};

describe("access-routes peer session cookie", () => {
  it("peerSessionCookie verilirse oturum token'ı cookie olarak eklenir", async () => {
    const { app, captured } = await buildApp("container_session");
    const response = await app.inject({
      method: "GET",
      url: "/peers/c-1/services/local-admin/assets/app.js",
      headers: USER_HEADERS,
    });
    expect(response.statusCode).toBe(200);
    expect(captured[0]?.headers.cookie).toBe("container_session=peer-jwt-1");
  });

  it("peerSessionCookie yoksa cookie eklenmez", async () => {
    const { app, captured } = await buildApp(undefined);
    await app.inject({
      method: "GET",
      url: "/peers/c-1/services/local-admin/assets/app.js",
      headers: USER_HEADERS,
    });
    expect(captured[0]?.headers.cookie).toBeUndefined();
  });

  it("mevcut cookie korunarak oturum cookie'si eklenir", async () => {
    const { app, captured } = await buildApp("container_session");
    await app.inject({
      method: "GET",
      url: "/peers/c-1/services/local-admin/assets/app.js",
      headers: { ...USER_HEADERS, cookie: "other=1" },
    });
    expect(captured[0]?.headers.cookie).toBe("other=1; container_session=peer-jwt-1");
  });
});

describe("access-routes host-based kök-montaj (A2)", () => {
  const hostMap = new Map([["127.0.0.1:5101", { peerId: "revpi-1", serviceId: "revpi-dashboard" }]]);

  it("eşlenen host'ta tam path upstream'e gider (prefix strip yok)", async () => {
    const { app, authorized } = await buildApp(undefined, hostMap);
    const response = await app.inject({
      method: "GET",
      url: "/cockpit-revpi/cockpit/static/login.js",
      headers: { ...USER_HEADERS, host: "127.0.0.1:5101" },
    });
    expect(response.statusCode).toBe(200);
    expect(authorized[0]?.peerId).toBe("revpi-1");
    expect(authorized[0]?.serviceId).toBe("revpi-dashboard");
    expect(authorized[0]?.path).toBe("/cockpit-revpi/cockpit/static/login.js");
  });

  it("eşlenmeyen host + path parametresiz → 404", async () => {
    const { app } = await buildApp(undefined, hostMap);
    const response = await app.inject({
      method: "GET",
      url: "/cockpit-revpi/cockpit/static/login.js",
      headers: { ...USER_HEADERS, host: "127.0.0.1:9999" },
    });
    expect(response.statusCode).toBe(404);
  });

  it("hostMap varken path-modu geriye dönük çalışır", async () => {
    const { app, authorized } = await buildApp(undefined, hostMap);
    const response = await app.inject({
      method: "GET",
      url: "/peers/c-1/services/local-admin/assets/app.js",
      headers: USER_HEADERS,
    });
    expect(response.statusCode).toBe(200);
    expect(authorized[0]?.path).toBe("/assets/app.js");
  });
});

describe("access-routes header iletimi", () => {
  it("cookie yolunda authorization + özel başlıklar iletilir", async () => {
    const { app, captured } = await buildApp(undefined, undefined, {
      cookieSession: true,
    });
    await app.inject({
      method: "GET",
      url: "/peers/c-1/services/local-admin/cockpit-revpi/cockpit/login",
      headers: {
        cookie: "tunnel_session=t",
        authorization: "Basic cGk6cHc=",
        "x-superuser": "sudo",
        referer: "http://127.0.0.1:5101/",
      },
    });
    expect(captured[0]?.headers.authorization).toBe("Basic cGk6cHc=");
    expect(captured[0]?.headers["x-superuser"]).toBe("sudo");
    expect(captured[0]?.headers.referer).toBe("http://127.0.0.1:5101/");
  });

  it("consumer-token yolunda authorization iletilmez", async () => {
    const { app, captured } = await buildApp();
    await app.inject({
      method: "GET",
      url: "/peers/c-1/services/local-admin/assets/app.js",
      headers: USER_HEADERS,
    });
    expect(captured[0]?.headers.authorization).toBeUndefined();
    // Hub-içi kullanıcı başlıkları da upstream'e gitmez.
    expect(captured[0]?.headers["x-tunnel-user-id"]).toBeUndefined();
  });

  it("hop-by-hop başlıklar iletilmez", async () => {
    const { app, captured } = await buildApp(undefined, undefined, {
      cookieSession: true,
    });
    await app.inject({
      method: "GET",
      url: "/peers/c-1/services/local-admin/assets/app.js",
      headers: {
        cookie: "tunnel_session=t",
        connection: "keep-alive",
        "content-length": "0",
      },
    });
    expect(captured[0]?.headers.connection).toBeUndefined();
    expect(captured[0]?.headers["content-length"]).toBeUndefined();
  });
});

describe("access-routes WS handshake header iletimi", () => {
  it("cookie yolunda WS'e cookie+authorization taşınır, handshake-özgü düşer", async () => {
    const { app, capturedWs } = await buildApp(undefined, undefined, {
      cookieSession: true,
    });
    const socket = await app.injectWS(
      "/peers/c-1/services/local-admin/ws/channel",
      {
        headers: {
          cookie: "tunnel_session=t; cockpit=sess-1",
          authorization: "Basic cGk6cHc=",
          "sec-websocket-key": "browser-key",
          "sec-websocket-protocol": "cockpit1",
          origin: "https://127.0.0.1:5101",
        },
      },
    );
    await new Promise((r) => setTimeout(r, 50));
    socket.close();
    const headers = capturedWs[0]?.headers ?? {};
    expect(headers.cookie).toContain("cockpit=sess-1");
    expect(headers.authorization).toBe("Basic cGk6cHc=");
    expect(headers["sec-websocket-protocol"]).toBe("cockpit1");
    expect(headers["sec-websocket-key"]).toBeUndefined();
    expect(headers.origin).toBeUndefined();
  });

  it("consumer-token yolunda WS authorization sızmaz", async () => {
    const { app, capturedWs } = await buildApp();
    const socket = await app.injectWS(
      "/peers/c-1/services/local-admin/ws/channel",
      { headers: { authorization: "Bearer ct" } },
    );
    await new Promise((r) => setTimeout(r, 50));
    socket.close();
    expect(capturedWs[0]?.headers?.authorization).toBeUndefined();
  });
});

describe("access-routes bayat oturum semantiği", () => {
  it("bayat tunnel_session cookie + consumer token yok → 401 'Oturum suresi doldu' + cookie temizlenir", async () => {
    const { app } = await buildApp();
    const res = await app.inject({
      method: "GET",
      url: "/peers/c-1/services/s-1/",
      headers: { cookie: "tunnel_session=stale-token" },
    });
    expect(res.statusCode).toBe(401);
    expect(res.json()).toEqual({ error: "Oturum suresi doldu" });
    expect(res.headers["set-cookie"]).toContain("tunnel_session=;");
    expect(res.headers["set-cookie"]).toContain("Max-Age=0");
  });

  it("cookie yok + consumer token yok → 401 'Consumer token gerekli' (geriye dönük)", async () => {
    const { app } = await buildApp();
    const res = await app.inject({
      method: "GET",
      url: "/peers/c-1/services/s-1/",
    });
    expect(res.statusCode).toBe(401);
    expect(res.json()).toEqual({ error: "Consumer token gerekli" });
  });

  it("bayat cookie olsa da geçerli consumer token yolu çalışır", async () => {
    const { app } = await buildApp();
    const res = await app.inject({
      method: "GET",
      url: "/peers/c-1/services/s-1/",
      headers: { cookie: "tunnel_session=stale-token", ...USER_HEADERS },
    });
    expect(res.statusCode).toBe(200);
  });

  it("bayat session cookie ile WS → 1008 'oturum suresi doldu' (neden çözümü)", () => {
    expect(sessionRejectReason("tunnel_session=stale", "tunnel_session")).toBe(
      "oturum suresi doldu",
    );
    expect(sessionRejectReason(undefined, "tunnel_session")).toBe(
      "consumer token gerekli",
    );
    expect(sessionRejectReason("other=1", "tunnel_session")).toBe(
      "consumer token gerekli",
    );
  });
});
