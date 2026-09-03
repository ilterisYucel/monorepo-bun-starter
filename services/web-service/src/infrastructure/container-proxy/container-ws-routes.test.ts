import { describe, it, expect, vi, afterEach } from "vitest";
import Fastify from "fastify";
import websocket from "@fastify/websocket";
import WebSocket from "ws";
import { containerWsRoutes } from "./container-ws-routes";
import type { IContainerProxy } from "@gd-monorepo/platform-container-access";

/**
 * container-ws-routes sözleşmesi (Faz 1 T1.1):
 *
 * KARAKTERİZASYON (değişiklik öncesi, doğrulandı): token doğrulaması YOKTU;
 * containerUrl self-reported trust ediliyordu. T1.1 ile:
 * - Bearer token yoksa → 401 (upgrade ÖNCESİ).
 * - Hash'i registry'de olmayan token → 401.
 * - Geçerli token → registerContainer(containerId, ws, token) çağrılır.
 * - Register mesajındaki containerUrl YOK SAYILIR (self-reported trust kalktı).
 */

function makeProxy(overrides: Partial<IContainerProxy> = {}): IContainerProxy & { calls: string[] } {
  const proxy = {
    calls: [] as string[],
    registerContainer: vi.fn(async function (this: { calls: string[] }, _id: string, _ws: unknown, _token?: string) {
      this.calls.push("registerContainer");
    }),
    authenticateContainerToken: vi.fn().mockResolvedValue(true),
    unregisterContainer: vi.fn(),
    latestTelemetry: vi.fn().mockReturnValue([]),
    historical: vi.fn(),
    allHistorical: vi.fn(),
    connectionStatus: vi.fn(),
    addObserver: vi.fn(),
    removeObserver: vi.fn(),
    health: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    ...overrides,
  };
  return proxy as unknown as IContainerProxy & { calls: string[] };
}

async function buildServer(proxy: IContainerProxy) {
  const app = Fastify();
  await app.register(websocket);
  await app.register(async (fastify) => {
    await containerWsRoutes(fastify, { containerProxy: proxy });
  });
  await app.listen({ port: 0, host: "127.0.0.1" });
  return app;
}

function connect(port: number, token?: string): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/ws/container`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    ws.on("open", () => resolve(ws));
    ws.on("error", reject);
  });
}

const servers: Array<ReturnType<typeof buildServer> extends Promise<infer T> ? T : never> = [];

afterEach(async () => {
  await Promise.allSettled(servers.splice(0).map((s) => s.close()));
});

describe("container-ws-routes T1.1 sözleşmesi", () => {
  it("token yoksa upgrade öncesi 401", async () => {
    const proxy = makeProxy({ authenticateContainerToken: vi.fn().mockResolvedValue(false) });
    const app = await buildServer(proxy);
    servers.push(app);
    const address = app.server.address();
    const port = typeof address === "object" && address ? address.port : 0;

    await expect(
      new Promise((resolve, reject) => {
        const ws = new WebSocket(`ws://127.0.0.1:${port}/ws/container`);
        ws.on("open", () => resolve(true));
        ws.on("error", reject);
      }),
    ).rejects.toThrow();
  });

  it("hash'i registry'de olmayan token → 401", async () => {
    const proxy = makeProxy({ authenticateContainerToken: vi.fn().mockResolvedValue(false) });
    const app = await buildServer(proxy);
    servers.push(app);
    const address = app.server.address();
    const port = typeof address === "object" && address ? address.port : 0;

    await expect(
      new Promise((resolve, reject) => {
        const ws = new WebSocket(`ws://127.0.0.1:${port}/ws/container`, {
          headers: { Authorization: "Bearer sahte" },
        });
        ws.on("open", () => resolve(true));
        ws.on("error", reject);
      }),
    ).rejects.toThrow();
  });

  it("geçerli token + register mesajı → registerContainer(token) çağrılır", async () => {
    const proxy = makeProxy();
    const app = await buildServer(proxy);
    servers.push(app);
    const address = app.server.address();
    const port = typeof address === "object" && address ? address.port : 0;

    const ws = await connect(port, "gecerli-token");
    ws.send(JSON.stringify({ type: "register", containerId: "c-1", containerUrl: "http://kotu" }));

    await vi.waitFor(() => {
      expect(proxy.calls).toContain("registerContainer");
    });
    const args = (proxy.registerContainer as ReturnType<typeof vi.fn>).mock.calls[0] as unknown[];
    expect(args[0]).toBe("c-1");
    expect(args[2]).toBe("gecerli-token");
    ws.close();
  });

  it("register mesajındaki containerUrl setContainerUrl'ı tetikLEMEZ (trust kalktı)", async () => {
    const proxy = makeProxy();
    const app = await buildServer(proxy);
    servers.push(app);
    const address = app.server.address();
    const port = typeof address === "object" && address ? address.port : 0;

    const ws = await connect(port, "gecerli-token");
    ws.send(
      JSON.stringify({ type: "register", containerId: "c-2", containerUrl: "http://kotu-bir-url" }),
    );

    await vi.waitFor(() => {
      expect(proxy.calls).toContain("registerContainer");
    });
    expect("setContainerUrl" in proxy.calls).toBe(false);
    ws.close();
  });
});
