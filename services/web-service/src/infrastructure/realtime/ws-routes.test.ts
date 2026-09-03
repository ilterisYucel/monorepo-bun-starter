import { describe, it, expect, vi, afterEach } from "vitest";
import Fastify from "fastify";
import websocket from "@fastify/websocket";
import WebSocket from "ws";
import type { AddressInfo } from "node:net";
import { telemetryWsRoutes } from "./ws-routes";
import type { RealtimeManager } from "./realtime-manager";
import type { ITokenService } from "../../domain/services/ITokenService";
import type { ContainerSessionStore } from "@gd-monorepo/ws-tunnel";
import type { User } from "@gd-monorepo/shared-types";

/**
 * ws-routes sözleşmesi (2026-08-30 — T1.5 karakterizasyonu):
 * - /ws/telemetry handshake'inde query `token` ZORUNLUDUR; yok/geçersiz → 401.
 * - Access token geçerliyse bağlantı kurulur; tünel oturum token'ı da
 *   sessionStore.authenticate ile kabul edilir (Faz 3).
 * - subscribe/unsubscribe mesajları realtime'a delege edilir ve karşılık
 *   döner; malform mesaj "error" tipi yanıt üretir; kapanışta unsubscribeAll.
 */

const user: User = {
  id: "u-1",
  username: "op",
  role: "teknik",
  name: "Op",
  createdAt: "",
  updatedAt: "",
};

function makeRealtime(): RealtimeManager {
  return {
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
    unsubscribeAll: vi.fn(),
    sendInitialData: vi.fn().mockResolvedValue(undefined),
  } as unknown as RealtimeManager;
}

function makeTokens(): ITokenService {
  return {
    signAccess: vi.fn(),
    signRefresh: vi.fn(),
    signMfa: vi.fn(),
    verifyMfa: vi.fn(),
    verifyRefresh: vi.fn(),
    verifyAccess: vi.fn().mockImplementation(async (token: string) => {
      if (token === "gecerli-access") return user;
      throw new Error("invalid");
    }),
  };
}

function makeSessionStore(): ContainerSessionStore {
  return {
    authenticate: vi.fn().mockImplementation(async (token: string) =>
      token === "gecerli-session" ? user : undefined,
    ),
  } as unknown as ContainerSessionStore;
}

const servers: Array<{ close: () => Promise<void> }> = [];

async function startServer(options: {
  realtime: RealtimeManager;
  tokens: ITokenService;
  sessionStore?: ContainerSessionStore;
}): Promise<number> {
  const app = Fastify();
  await app.register(websocket);
  app.register(async (f) => {
    await telemetryWsRoutes(f, options);
  });
  await app.listen({ port: 0 });
  const port = (app.server.address() as AddressInfo).port;
  servers.push({ close: () => app.close() });
  return port;
}

function connect(port: number, token?: string): WebSocket {
  const query = token ? `?token=${token}` : "";
  return new WebSocket(`ws://127.0.0.1:${port}/ws/telemetry${query}`);
}

function nextMessage(ws: WebSocket): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("mesaj zaman asimi")), 3000);
    ws.once("message", (raw) => {
      clearTimeout(timer);
      resolve(JSON.parse(raw.toString()));
    });
  });
}

afterEach(async () => {
  await Promise.allSettled(servers.splice(0).map((s) => s.close()));
});

describe("ws-routes /ws/telemetry (T1.5) @nis2-security", () => {
  it("token'sız handshake 401 ile reddedilir", async () => {
    const port = await startServer({
      realtime: makeRealtime(),
      tokens: makeTokens(),
    });
    const ws = connect(port);
    await new Promise<void>((resolve, reject) => {
      ws.once("open", () => reject(new Error("401 beklenirken açıldı")));
      ws.once("error", () => resolve());
    });
    expect(ws.readyState).toBe(WebSocket.CLOSED);
  });

  it("geçersiz token 401 ile reddedilir", async () => {
    const port = await startServer({
      realtime: makeRealtime(),
      tokens: makeTokens(),
    });
    const ws = connect(port, "sahte-token");
    await new Promise<void>((resolve, reject) => {
      ws.once("open", () => reject(new Error("401 beklenirken açıldı")));
      ws.once("error", () => resolve());
    });
  });

  it("geçerli access token bağlanır; subscribe → subscribed + initial data", async () => {
    const realtime = makeRealtime();
    const port = await startServer({ realtime, tokens: makeTokens() });
    const ws = connect(port, "gecerli-access");
    await new Promise<void>((resolve, reject) => {
      ws.once("open", () => resolve());
      ws.once("error", reject);
    });

    ws.send(JSON.stringify({ type: "subscribe", deviceId: "BSC-1" }));
    const reply = await nextMessage(ws);
    expect(reply).toEqual({ type: "subscribed", deviceId: "BSC-1" });
    expect(realtime.subscribe).toHaveBeenCalledWith("BSC-1", expect.anything());
    expect(realtime.sendInitialData).toHaveBeenCalledWith("BSC-1", expect.anything());
    ws.close();
  });

  it("tünel oturum token'ı sessionStore üzerinden kabul edilir (Faz 3)", async () => {
    const realtime = makeRealtime();
    const sessionStore = makeSessionStore();
    const port = await startServer({ realtime, tokens: makeTokens(), sessionStore });
    const ws = connect(port, "gecerli-session");
    await new Promise<void>((resolve, reject) => {
      ws.once("open", () => resolve());
      ws.once("error", reject);
    });
    expect(sessionStore.authenticate).toHaveBeenCalledWith("gecerli-session");
    ws.close();
  });

  it("unsubscribe → unsubscribed karşılığı döner", async () => {
    const realtime = makeRealtime();
    const port = await startServer({ realtime, tokens: makeTokens() });
    const ws = connect(port, "gecerli-access");
    await new Promise<void>((resolve, reject) => {
      ws.once("open", () => resolve());
      ws.once("error", reject);
    });
    ws.send(JSON.stringify({ type: "unsubscribe", deviceId: "BSC-1" }));
    const reply = await nextMessage(ws);
    expect(reply).toEqual({ type: "unsubscribed", deviceId: "BSC-1" });
    expect(realtime.unsubscribe).toHaveBeenCalledWith("BSC-1", expect.anything());
    ws.close();
  });

  it("malform JSON mesajı error tipi yanıt üretir (bağlantı kopmaz)", async () => {
    const realtime = makeRealtime();
    const port = await startServer({ realtime, tokens: makeTokens() });
    const ws = connect(port, "gecerli-access");
    await new Promise<void>((resolve, reject) => {
      ws.once("open", () => resolve());
      ws.once("error", reject);
    });
    ws.send("bu-json-degil");
    const reply = await nextMessage(ws);
    expect(reply).toEqual({ type: "error", message: "Invalid message format" });
    ws.close();
  });

  it("kapanışta realtime.unsubscribeAll çağrılır", async () => {
    const realtime = makeRealtime();
    const port = await startServer({ realtime, tokens: makeTokens() });
    const ws = connect(port, "gecerli-access");
    await new Promise<void>((resolve, reject) => {
      ws.once("open", () => resolve());
      ws.once("error", reject);
    });
    ws.close();
    await new Promise<void>((resolve) => {
      const interval = setInterval(() => {
        if ((realtime.unsubscribeAll as ReturnType<typeof vi.fn>).mock.calls.length > 0) {
          clearInterval(interval);
          resolve();
        }
      }, 20);
    });
    expect(realtime.unsubscribeAll).toHaveBeenCalled();
  });
});
