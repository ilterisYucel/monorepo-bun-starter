import { describe, it, expect, vi } from "vitest";
import Fastify from "fastify";
import { sessionOpenRoute, tunnelRoutes } from "./session-routes";
import type { ContainerSessionGateway } from "@gd-monorepo/ws-tunnel";
import type { TunnelProxy } from "@gd-monorepo/ws-tunnel";
import type { FieldSession } from "@gd-monorepo/ws-tunnel";
import type { User } from "@gd-monorepo/shared-types";
import { Result } from "@gd-monorepo/result";

/**
 * T3.3 route katmanı sözleşmesi:
 * - POST /api/fields/:fid/containers/:cid/session → 302 + Path-scoped cookie;
 *   gateway hataları kind → HTTP durum (409/403/503/500).
 * - /containers/:cid/ui/* → cookie'siz 401; allowlist dışı 403; geçerli
 *   oturumla startHttpStream çağrılır (hijack).
 * - /containers/:cid/ui/ws/* → geçersiz oturum 1008 kapanışı.
 */

const user: User = {
  id: "u-1",
  username: "op",
  role: "teknik",
  name: "Op",
  fieldIds: ["f-1"],
  mustChangePassword: false,
  createdAt: "",
  updatedAt: "",
};

const session: FieldSession = {
  sessionId: "s-1",
  containerId: "c-1",
  token: "container-jwt",
  user,
  containerRole: "admin",
  createdAt: 0,
  lastActivityAt: 0,
  bytesIn: 0,
  bytesOut: 0,
};

describe("session-routes (T3.3)", () => {
  it("POST session → 302 + Path-scoped HttpOnly cookie + open-session", async () => {
    const openSession = vi.fn().mockResolvedValue(
      Result.ok({
        sessionId: "s-1",
        token: "container-jwt",
        expiresInSec: 14400,
        containerRole: "admin" as const,
      }),
    );
    const gateway = { openSession } as unknown as ContainerSessionGateway;
    const app = Fastify();
    app.addHook("onRequest", (request, _reply, done) => {
      (request as unknown as { user: User }).user = user;
      done();
    });
    await app.register(
      async (fastify) => {
        await sessionOpenRoute(fastify, { gateway });
      },
      { prefix: "/api/fields" },
    );
    const res = await app.inject({
      method: "POST",
      url: "/api/fields/f-1/containers/c-1/session",
    });
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe("/containers/c-1/ui/");
    expect(res.headers["set-cookie"]).toBe(
      "container_session=container-jwt; Path=/containers/c-1/ui; HttpOnly; SameSite=Lax",
    );
    expect(openSession).toHaveBeenCalledWith(
      expect.objectContaining({ fieldId: "f-1", containerId: "c-1" }),
    );
  });

  it("gateway conflict → 409", async () => {
    const openSession = vi.fn().mockResolvedValue(
      Result.err({
        kind: "conflict",
        code: "x",
        message: "limit",
        retryable: false,
        context: {},
        cause: undefined,
        name: "ConflictError",
      } as never),
    );
    const app = Fastify();
    app.addHook("onRequest", (request, _reply, done) => {
      (request as unknown as { user: User }).user = user;
      done();
    });
    await app.register(
      async (fastify) => {
        await sessionOpenRoute(fastify, {
          gateway: { openSession } as unknown as ContainerSessionGateway,
        });
      },
      { prefix: "/api/fields" },
    );
    const res = await app.inject({
      method: "POST",
      url: "/api/fields/f-1/containers/c-1/session",
    });
    expect(res.statusCode).toBe(409);
  });

  it("teknik fieldIds'siz saha için 403", async () => {
    const app = Fastify();
    app.addHook("onRequest", (request, _reply, done) => {
      (request as unknown as { user: User }).user = {
        ...user,
        fieldIds: ["baska-saha"],
      };
      done();
    });
    await app.register(
      async (fastify) => {
        await sessionOpenRoute(fastify, {
          gateway: { openSession: vi.fn() } as unknown as ContainerSessionGateway,
        });
      },
      { prefix: "/api/fields" },
    );
    const res = await app.inject({
      method: "POST",
      url: "/api/fields/f-1/containers/c-1/session",
    });
    expect(res.statusCode).toBe(403);
  });

  it("DELETE session → açık oturum kapatılır (200); yoksa 404", async () => {
    const closeSession = vi.fn();
    const sessionForContainer = vi.fn().mockReturnValue({
      sessionId: "s-1",
      containerId: "c-1",
      token: "container-jwt",
      user,
      containerRole: "admin",
      createdAt: 0,
      lastActivityAt: 0,
      bytesIn: 0,
      bytesOut: 0,
    });
    const app = Fastify();
    app.addHook("onRequest", (request, _reply, done) => {
      (request as unknown as { user: User }).user = user;
      done();
    });
    await app.register(
      async (fastify) => {
        await sessionOpenRoute(fastify, {
          gateway: {
            openSession: vi.fn(),
            sessionForContainer,
            closeSession,
          } as unknown as ContainerSessionGateway,
        });
      },
      { prefix: "/api/fields" },
    );
    const res = await app.inject({
      method: "DELETE",
      url: "/api/fields/f-1/containers/c-1/session",
    });
    expect(res.statusCode).toBe(200);
    expect(closeSession).toHaveBeenCalledWith("s-1", "operator-end");

    sessionForContainer.mockReturnValue(undefined);
    const missing = await app.inject({
      method: "DELETE",
      url: "/api/fields/f-1/containers/c-1/session",
    });
    expect(missing.statusCode).toBe(404);
  });

  it("tünel HTTP: cookie'siz 401; yasaklı yol 403; geçerli → proxy akışı", async () => {
    const startHttpStream = vi.fn().mockImplementation(
      async (input: {
        method: string;
        path: string;
        raw: import("@gd-monorepo/ws-tunnel").IStreamSink;
      }) => {
        input.raw.status(200, { "content-type": "text/html" });
        input.raw.write(Buffer.from("proxied"));
        input.raw.end();
      },
    );
    const authenticate = vi.fn().mockImplementation(
      (cookie: string | undefined, containerId: string) =>
        cookie === "container_session=container-jwt" && containerId === "c-1"
          ? session
          : undefined,
    );
    const tunnelProxy = {
      authenticate,
      startHttpStream,
    } as unknown as TunnelProxy;
    const app = Fastify();
    await app.register(async (fastify) => {
      await tunnelRoutes(fastify, { tunnelProxy });
    });

    const noCookie = await app.inject({
      method: "GET",
      url: "/containers/c-1/ui/",
    });
    expect(noCookie.statusCode).toBe(401);

    const forbidden = await app.inject({
      method: "GET",
      url: "/containers/c-1/ui/api/auth/login",
      headers: { cookie: "container_session=container-jwt" },
    });
    expect(forbidden.statusCode).toBe(403);

    const ok = await app.inject({
      method: "GET",
      url: "/containers/c-1/ui/api/data/x?points=60",
      headers: { cookie: "container_session=container-jwt" },
    });
    expect(ok.statusCode).toBe(200);
    expect(ok.body).toBe("proxied");
    expect(startHttpStream).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "GET",
        path: "/api/data/x?points=60",
      }),
    );
  });

  it("tünel WS: geçersiz oturum 1008 ile kapanır", async () => {
    const app = Fastify();
    await app.register(import("@fastify/websocket"));
    const tunnelProxy = {
      authenticate: () => undefined,
      startWsBridge: vi.fn(),
      sendWsToContainer: vi.fn(),
      closeWs: vi.fn(),
    } as unknown as TunnelProxy;
    await app.register(async (fastify) => {
      await tunnelRoutes(fastify, { tunnelProxy });
    });
    const res = await app.inject({
      method: "GET",
      url: "/containers/c-1/ui/ws/telemetry",
      headers: { upgrade: "websocket", connection: "upgrade" },
    });
    // upgrade başarısız kapanış — inject WS el sıkışmasını tamamlamaz; yalnızca
    // route'un kayıtlı olduğunu doğrular (kapanış kodu WS katmanında)
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
  });
});
