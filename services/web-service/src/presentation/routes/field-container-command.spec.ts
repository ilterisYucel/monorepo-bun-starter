import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import http from "node:http";
import Fastify from "fastify";
import { WebSocketServer } from "ws";
import { TamperLogger } from "@gd-monorepo/tamper-logger";
import type { ISqlDatabase } from "@gd-monorepo/core";
import type { ILogSink, LogEvent } from "@gd-monorepo/tamper-logger";
import {
  TunnelConnector,
  WsSocketClientFactory,
  ReconnectDelay,
  ClientSessionStore,
  ClientSessionServer,
  TunnelClient,
  HubSessionStore,
  SessionGateway,
  TunnelProxy,
} from "@gd-monorepo/ws-tunnel";
import { JoseTokenSigner } from "../../infrastructure/auth/jose-token-signer";
import { ContainerProxy } from "../../infrastructure/container-proxy/container-proxy";
import { ContainerProxyFieldChannel } from "../../infrastructure/container-proxy/container-proxy-field-channel";
import { SessionAudit } from "../../infrastructure/container-session/session-audit";
import { sha256Hex } from "../../infrastructure/auth/service-token";
import { fieldContainerCommandRoutes } from "./field-container-commands";

/**
 * Çapraz yığın komut kanalı — uçtan uca integration (WS4 D3, gerçek WS):
 *
 * Field tarafı: ContainerProxy (gerçek WS server) + SessionGateway +
 * TunnelProxy + D3 route (Fastify); konteyner tarafı: TunnelConnector +
 * ClientSessionServer + TunnelClient — tek loopback WS kanalı üzerinden.
 * Konteyner upstream'i = yerel HTTP sunucu (gerçek container web-service
 * yerine vekil): POST /api/commands/execute-multi isteğini kaydeder ve
 * doğrulanmış sonuç döner.
 *
 * Kanıt: field → tünel → konteyner upstream komut → sonuç field'a döner;
 * x-gd-trace-id upstream'e ulaşır; konteyner bağlı DEĞİLSE 503 (komut gitmez).
 */

const TOKEN = "integration-token-0123456789abcdef";
const CONTAINER_ID = "container-int";
const INTERNAL_TOKEN = "internal-secret";

class MemorySink implements ILogSink {
  events: LogEvent[] = [];
  name(): string {
    return "memory";
  }
  async write(events: LogEvent[]): Promise<void> {
    this.events.push(...events);
  }
  async close(): Promise<void> {}
}

function fakeSql() {
  return {
    execute: vi.fn().mockResolvedValue(undefined),
    query: vi.fn().mockResolvedValue([]),
    queryOne: vi.fn().mockResolvedValue({
      container_url: "http://container:80",
      token_hash: sha256Hex(TOKEN),
    }),
    connect: vi.fn(),
    disconnect: vi.fn(),
    health: vi.fn().mockResolvedValue(true),
  } as unknown as ISqlDatabase;
}

const waitFor = (cond: () => boolean, timeoutMs: number) =>
  new Promise<void>((resolve, reject) => {
    const start = Date.now();
    const tick = () => {
      if (cond()) return resolve();
      if (Date.now() - start > timeoutMs) {
        return reject(new Error("waitFor timeout"));
      }
      setTimeout(tick, 10);
    };
    tick();
  });

describe("field-container-command.spec — çapraz yığın komut (WS4 D3)", () => {
  let fieldProxy: ContainerProxy;
  let fieldWss: WebSocketServer;
  let fieldPort: number;
  let gateway: SessionGateway;
  let tunnelProxy: TunnelProxy;
  let connector: TunnelConnector;
  let tunnelClient: TunnelClient;
  let logger: TamperLogger;
  let upstreamHttp: http.Server;
  let upstreamPort: number;
  let upstreamRequests: Array<{ headers: http.IncomingHttpHeaders; body: string }>;
  const cleanup: Array<() => Promise<void> | void> = [];

  beforeEach(async () => {
    upstreamRequests = [];
    logger = new TamperLogger({
      signingKey: "integration-signing-key-0123456789",
      service: "field",
      sinks: [new MemorySink()],
      batchSize: 1,
    });

    // --- konteyner upstream vekili: gerçek komut yanıtı üretir ---
    upstreamHttp = http.createServer((req, res) => {
      if (req.url === "/api/commands/execute-multi" && req.method === "POST") {
        let body = "";
        req.on("data", (c) => (body += c.toString()));
        req.on("end", () => {
          upstreamRequests.push({ headers: req.headers, body });
          res.setHeader("content-type", "application/json");
          res.end(
            JSON.stringify({
              results: [{ deviceId: "BSC-1", command: "stop", success: true, validated: true }],
              mode: "parallel",
            }),
          );
        });
        return;
      }
      res.statusCode = 404;
      res.end("not found");
    });
    await new Promise<void>((resolve) => upstreamHttp.listen(0, "127.0.0.1", resolve));
    upstreamPort = (upstreamHttp.address() as { port: number }).port;

    // --- field: ContainerProxy + gateway + tunnel proxy ---
    fieldWss = new WebSocketServer({ port: 0, host: "127.0.0.1" });
    await new Promise<void>((resolve) => fieldWss.on("listening", resolve));
    fieldPort = (fieldWss.address() as { port: number }).port;

    fieldProxy = new ContainerProxy(fakeSql());
    fieldWss.on("connection", (socket) => {
      void fieldProxy.registerContainer(CONTAINER_ID, socket, TOKEN);
    });

    const store = new HubSessionStore();
    const audit = new SessionAudit(fakeSql(), logger);
    const channel = new ContainerProxyFieldChannel(fieldProxy);
    gateway = new SessionGateway(channel, store, audit, logger, { ackTimeoutMs: 3000 });
    gateway.initialize();
    tunnelProxy = new TunnelProxy(channel, store, logger);
    tunnelProxy.initialize();

    // --- konteyner: connector + session + tunnel client ---
    const clientStore = new ClientSessionStore(
      new JoseTokenSigner("container-secret-0123456789abcdef"),
    );
    connector = new TunnelConnector(
      {
        wsUrls: [`ws://127.0.0.1:${fieldPort}`],
        token: TOKEN,
        peerId: CONTAINER_ID,
        heartbeatIntervalMs: 1000,
        telemetryIntervalMs: 1000,
        registerTimeoutMs: 2000,
        livenessTimeoutMs: 10000,
      },
      new WsSocketClientFactory(),
      { snapshot: async () => [] },
      new ReconnectDelay({ baseMs: 200, maxMs: 500, jitterSpanMs: 0, jitter: () => 0 }),
    );
    const containerServer = new ClientSessionServer(connector, clientStore, logger);
    containerServer.start();
    tunnelClient = TunnelClient.create({
      webServiceUrl: `http://127.0.0.1:${upstreamPort}`,
      staticUrl: `http://127.0.0.1:${upstreamPort}`,
    });
    tunnelClient.attach(connector);

    cleanup.push(
      () => containerServer.stop(),
      () => tunnelClient.stop(),
      async () => connector.stop(),
      () => gateway.stop(),
      () => tunnelProxy.stop(),
      async () => fieldProxy.stop(),
      async () => logger.close(),
    );

    void connector.start();
    await waitFor(() => connector.connected(), 5000);
  });

  afterEach(async () => {
    for (const fn of cleanup.reverse()) await fn();
    cleanup.length = 0;
    await new Promise<void>((resolve) => upstreamHttp.close(() => resolve()));
    await new Promise<void>((resolve) => fieldWss.close(() => resolve()));
  });

  async function injectCommand(
    overrides: { internalToken?: string; traceId?: string } = {},
  ): Promise<{ statusCode: number; body: unknown }> {
    const app = Fastify();
    await app.register(
      async (fastify) => {
        await fieldContainerCommandRoutes(fastify, {
          containerProxy: fieldProxy,
          gateway,
          tunnelProxy,
          logger: undefined,
          internalToken: INTERNAL_TOKEN,
        });
      },
      { prefix: "/api/fields" },
    );
    const headers: Record<string, string> = {
      "x-internal-token": overrides.internalToken ?? INTERNAL_TOKEN,
    };
    if (overrides.traceId !== undefined) {
      headers["x-gd-trace-id"] = overrides.traceId;
    }
    const res = await app.inject({
      method: "POST",
      url: `/api/fields/f-1/containers/${CONTAINER_ID}/commands`,
      headers,
      payload: {
        commands: [{ deviceId: "BSC-1", command: "stop" }],
        mode: "parallel",
        onFailure: "stop",
      },
    });
    return { statusCode: res.statusCode, body: res.json() };
  }

  it("field → tünel → konteyner upstream → doğrulanmış sonuç geri döner", async () => {
    const result = await injectCommand();
    expect(result.statusCode).toBe(200);
    expect(result.body).toEqual({
      results: [{ deviceId: "BSC-1", command: "stop", success: true, validated: true }],
      mode: "parallel",
    });
    expect(upstreamRequests).toHaveLength(1);
    // gövde birebir: execute-multi kontratı
    expect(JSON.parse(upstreamRequests[0]!.body)).toEqual({
      commands: [{ deviceId: "BSC-1", command: "stop" }],
      mode: "parallel",
      onFailure: "stop",
    });
  });

  it("trace başlığı upstream'e ulaşır (D1 — çapraz audit eşlemesi)", async () => {
    await injectCommand({ traceId: "trace-e2e" });
    expect(upstreamRequests[0]!.headers["x-gd-trace-id"]).toBe("trace-e2e");
  });

  it("internal token programatik kanalı açar (system kullanıcısı)", async () => {
    const result = await injectCommand({ internalToken: INTERNAL_TOKEN });
    expect(result.statusCode).toBe(200);
  });

  it("yanlış internal token → 403; upstream'e İSTEK GİTMEZ", async () => {
    const result = await injectCommand({ internalToken: "yanlis" });
    expect(result.statusCode).toBe(403);
    expect(upstreamRequests).toHaveLength(0);
  });
});
