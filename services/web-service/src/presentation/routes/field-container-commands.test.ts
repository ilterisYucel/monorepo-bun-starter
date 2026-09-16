import { describe, it, expect, vi } from "vitest";
import Fastify from "fastify";
import type { SessionGateway, TunnelProxy, IStreamSink } from "@gd-monorepo/ws-tunnel";
import type { IContainerProxy } from "@gd-monorepo/platform-container-access";
import type { TamperLogger } from "@gd-monorepo/tamper-logger";
import { fieldContainerCommandRoutes } from "./field-container-commands";

/**
 * Field → konteyner komut proxy rotası sözleşmesi (WS4 D3):
 *
 * - POST /api/fields/:f/containers/:c/commands — İNCE proxy: iş mantığı YOK;
 *   konteyner siyah kutudur (execute-multi kontratı birebir iletilir).
 * - Konteyner "connected" değilse 503 — oturum/stream açılmaz.
 * - Oturum: mevcut peer oturumu varsa YENİDEN KULLANILIR; yoksa system
 *   kullanıcısıyla programatik açılır.
 * - startHttpStream: method POST, path /api/commands/execute-multi;
 *   başlıklarda x-gd-trace-id + container_session cookie.
 * - Yanıt: upstream durum kodu + gövde AYNEN geri döner (200/422).
 * - Audit: field_container_command (best-effort — akışı kesmez).
 */

const session = {
  sessionId: "s-1",
  peerId: "c-1",
  token: "container-jwt",
  user: { id: "system", username: "system", role: "admin" },
  peerRole: "admin",
  createdAt: 0,
  lastActivityAt: 0,
  bytesIn: 0,
  bytesOut: 0,
};

const BODY = {
  commands: [
    { deviceId: "BSC-1", command: "stop" },
    { deviceId: "BSC-2", command: "stop" },
  ],
  mode: "parallel",
  onFailure: "stop",
};

function makeDeps(overrides: {
  status?: string;
  openSession?: unknown;
  streamImpl?: (input: { raw: IStreamSink }) => Promise<void> | void;
} = {}) {
  const openSession = vi.fn(async () => ({
    isErr: () => false,
    unwrap: () => ({ sessionId: "s-new", token: "container-jwt", expiresInSec: 14400, peerRole: "admin" }),
  }));
  const sessionForPeer = vi.fn(() => undefined);
  const startHttpStream = vi.fn(
    overrides.streamImpl ??
      (async (input: { raw: IStreamSink }) => {
        input.raw.status(200, { "content-type": "application/json" });
        input.raw.write(Buffer.from(JSON.stringify({ results: [] })));
        input.raw.end();
      }),
  );
  const log = vi.fn(async () => undefined);
  const containerProxy = {
    connectionStatus: () =>
      new Map([["c-1", overrides.status ?? "connected"]]),
  } as unknown as IContainerProxy;
  const gateway = {
    sessionForPeer,
    openSession: overrides.openSession === undefined ? openSession : vi.fn(overrides.openSession as never),
  } as unknown as SessionGateway;
  const tunnelProxy = { startHttpStream } as unknown as TunnelProxy;
  const logger = { log } as unknown as TamperLogger;
  return { containerProxy, gateway, tunnelProxy, logger, startHttpStream, openSession, sessionForPeer, log };
}

async function inject(
  deps: ReturnType<typeof makeDeps>,
  body: unknown = BODY,
  headers: Record<string, string> = { "x-internal-token": "secret-token" },
) {
  const app = Fastify();
  await app.register(
    async (fastify) => {
      await fieldContainerCommandRoutes(fastify, {
        containerProxy: deps.containerProxy,
        gateway: deps.gateway,
        tunnelProxy: deps.tunnelProxy,
        logger: deps.logger,
        internalToken: "secret-token",
      });
    },
    { prefix: "/api/fields" },
  );
  return app.inject({
    method: "POST",
    url: "/api/fields/f-1/containers/c-1/commands",
    headers,
    payload: body,
  });
}

describe("field-container-commands (D3)", () => {
  it("yetki yok (token/user yok) → 403; oturum/stream açılmaz", async () => {
    const deps = makeDeps();
    const res = await inject(deps, BODY, {});
    expect(res.statusCode).toBe(403);
    expect(deps.startHttpStream).not.toHaveBeenCalled();
  });

  it("yanlış internal token → 403 (fail-closed)", async () => {
    const deps = makeDeps();
    const res = await inject(deps, BODY, { "x-internal-token": "yanlis" });
    expect(res.statusCode).toBe(403);
    expect(deps.startHttpStream).not.toHaveBeenCalled();
  });

  it("Bearer admin kullanıcı → kabul; guest → 403", async () => {
    const deps = makeDeps();
    const app = Fastify();
    const user = {
      id: "u-1",
      username: "operator",
      role: "admin",
    };
    app.addHook("onRequest", (request, _reply, done) => {
      (request as unknown as { user: unknown }).user = user;
      done();
    });
    await app.register(
      async (fastify) => {
        await fieldContainerCommandRoutes(fastify, {
          containerProxy: deps.containerProxy,
          gateway: deps.gateway,
          tunnelProxy: deps.tunnelProxy,
          logger: deps.logger,
          internalToken: undefined,
        });
      },
      { prefix: "/api/fields" },
    );
    const ok = await app.inject({
      method: "POST",
      url: "/api/fields/f-1/containers/c-1/commands",
      headers: {},
      payload: BODY,
    });
    expect(ok.statusCode).toBe(200);

    (user as { role: string }).role = "guest";
    const denied = await app.inject({
      method: "POST",
      url: "/api/fields/f-1/containers/c-1/commands",
      headers: {},
      payload: BODY,
    });
    expect(denied.statusCode).toBe(403);
  });

  it("konteyner connected değilse 503 — oturum/stream açılmaz", async () => {
    const deps = makeDeps({ status: "stale" });
    const res = await inject(deps);
    expect(res.statusCode).toBe(503);
    expect(deps.startHttpStream).not.toHaveBeenCalled();
    expect(deps.sessionForPeer).not.toHaveBeenCalled();
  });

  it("mevcut oturum yeniden kullanılır — programatik açılış YOK", async () => {
    const deps = makeDeps();
    deps.sessionForPeer.mockReturnValue(session);
    const res = await inject(deps);
    expect(res.statusCode).toBe(200);
    expect(deps.sessionForPeer).toHaveBeenCalledWith("c-1");
    expect(deps.gateway.openSession).not.toHaveBeenCalled();
  });

  it("oturum yoksa system kullanıcısıyla programatik açılır", async () => {
    const deps = makeDeps();
    const res = await inject(deps);
    expect(res.statusCode).toBe(200);
    expect(deps.gateway.openSession).toHaveBeenCalledWith({
      fieldId: "f-1",
      peerId: "c-1",
      user: expect.objectContaining({
        id: "system",
        username: "system",
        role: "admin",
      }),
      remoteIp: "127.0.0.1",
    });
  });

  it("stream: POST /api/commands/execute-multi + trace + cookie başlıkları", async () => {
    const deps = makeDeps();
    deps.sessionForPeer.mockReturnValue(session);
    await inject(deps, BODY, {
      "x-internal-token": "secret-token",
      "x-gd-trace-id": "trace-123",
    });
    expect(deps.startHttpStream).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "POST",
        path: "/api/commands/execute-multi",
        headers: expect.objectContaining({
          "content-type": "application/json",
          "x-gd-trace-id": "trace-123",
          cookie: "container_session=container-jwt",
        }),
        requestBody: Buffer.from(JSON.stringify(BODY)),
      }),
    );
  });

  it("upstream yanıtı AYNEN döner (200 → gövde)", async () => {
    const deps = makeDeps({
      streamImpl: async (input: { raw: IStreamSink }) => {
        input.raw.status(200, { "content-type": "application/json" });
        input.raw.write(
          Buffer.from(
            JSON.stringify({
              results: [{ deviceId: "BSC-1", command: "stop", success: true }],
            }),
          ),
        );
        input.raw.end();
      },
    });
    deps.sessionForPeer.mockReturnValue(session);
    const res = await inject(deps);
    expect(res.statusCode).toBe(200);
    expect(res.json().results).toHaveLength(1);
  });

  it("upstream 422 → durum kodu aynen, gövde aynen", async () => {
    const deps = makeDeps({
      streamImpl: async (input: { raw: IStreamSink }) => {
        input.raw.status(422, { "content-type": "application/json" });
        input.raw.write(
          Buffer.from(
            JSON.stringify({
              results: [{ deviceId: "BSC-1", command: "stop", success: false, reason: "Validation timeout" }],
            }),
          ),
        );
        input.raw.end();
      },
    });
    deps.sessionForPeer.mockReturnValue(session);
    const res = await inject(deps);
    expect(res.statusCode).toBe(422);
    expect(res.json().results[0]).toMatchObject({ success: false });
  });

  it("audit field_container_command — traceId bağlamda", async () => {
    const deps = makeDeps();
    deps.sessionForPeer.mockReturnValue(session);
    await inject(deps, BODY, {
      "x-internal-token": "secret-token",
      "x-gd-trace-id": "trace-123",
    });
    expect(deps.log).toHaveBeenCalledWith(
      expect.objectContaining({
        category: "audit",
        eventCode: "field_container_command",
        context: expect.objectContaining({ traceId: "trace-123", containerId: "c-1" }),
      }),
    );
  });

  it("audit hatası akışı KESMEZ (best-effort)", async () => {
    const deps = makeDeps();
    deps.sessionForPeer.mockReturnValue(session);
    deps.log.mockRejectedValue(new Error("audit kapali"));
    const res = await inject(deps);
    expect(res.statusCode).toBe(200);
  });

  it("stream destroy (kopma) → 502", async () => {
    const deps = makeDeps({
      streamImpl: (input: { raw: IStreamSink }) => {
        input.raw.status(200);
        input.raw.destroy();
      },
    });
    deps.sessionForPeer.mockReturnValue(session);
    const res = await inject(deps);
    expect(res.statusCode).toBe(502);
  });

  it("x-gd-trace-id yoksa üretilir", async () => {
    const deps = makeDeps();
    deps.sessionForPeer.mockReturnValue(session);
    const app = Fastify();
    await app.register(
      async (fastify) => {
        await fieldContainerCommandRoutes(fastify, {
          containerProxy: deps.containerProxy,
          gateway: deps.gateway,
          tunnelProxy: deps.tunnelProxy,
          logger: deps.logger,
          internalToken: "secret-token",
        });
      },
      { prefix: "/api/fields" },
    );
    const res = await app.inject({
      method: "POST",
      url: "/api/fields/f-1/containers/c-1/commands",
      headers: { "x-internal-token": "secret-token" },
      payload: BODY,
    });
    expect(res.statusCode).toBe(200);
    const headers = deps.startHttpStream.mock.calls[0]![0].headers as Record<string, string>;
    expect(headers["x-gd-trace-id"]).toBeTruthy();
  });
});
