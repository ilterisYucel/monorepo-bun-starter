import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import http from "node:http";
import { WebSocketServer } from "ws";
import { TamperLogger } from "@gd-monorepo/tamper-logger";

import type { ISqlDatabase } from "@gd-monorepo/core";
import type { ILogSink, LogEvent } from "@gd-monorepo/tamper-logger";

import {
  FieldConnector,
  WsSocketClientFactory,
  ReconnectDelay,
  ContainerSessionStore,
  ContainerSessionServer,
  TunnelClient,
} from "@gd-monorepo/ws-tunnel";
import { JoseTokenSigner } from "../auth/jose-token-signer";
import { ContainerProxy } from "../container-proxy/container-proxy";
import {
  FieldSessionStore,
  ContainerSessionGateway,
  TunnelProxy,
} from "@gd-monorepo/ws-tunnel";
import { SessionAudit } from "./session-audit";
import { ContainerProxyFieldChannel } from "../container-proxy/container-proxy-field-channel";
import { sha256Hex } from "../auth/service-token";
import type { User } from "@gd-monorepo/shared-types";


/**
 * Faz 3 uçtan uca integration — K3.1/K3.2/K3.3 kanıtı (gerçek WS):
 *
 * Container tarafı: FieldConnector (gerçek ws) + ContainerSessionStore/Server +
 * TunnelClient; field tarafı: ContainerProxy (gerçek ws server) + Gateway +
 * TunnelProxy + SessionAudit. Arada TCP loopback üzerinden TEK WS kanalı.
 *
 * K3.1: GET "/" → konteyner upstream'inden HTML gövde akar (FIN ile biter).
 * K3.2: GET /api/... JSON akar; /ws köprüsü çift yönlü WS_OP mesajları taşır.
 * K3.3: session_audit INSERT + `session_open` security logu yazılır.
 */

const TOKEN = "integration-token-0123456789abcdef";
const CONTAINER_ID = "container-int";

const user: User = {
  id: "u-1",
  username: "operator",
  role: "teknik",
  name: "Op",
  fieldIds: ["f-1"],
  mustChangePassword: false,
  createdAt: "",
  updatedAt: "",
};

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

function fakeSql(auditInserts: Array<{ sql: string; params: unknown[] }>) {
  return {
    execute: vi.fn((sql: string, params?: unknown[]) => {
      if (sql.includes("INSERT INTO session_audit")) {
        auditInserts.push({ sql, params: params ?? [] });
      }
      return Promise.resolve();
    }),
    query: vi.fn().mockResolvedValue([]),
    queryOne: vi.fn().mockResolvedValue({
      container_url: "http://container:80",
      token_hash: sha256Hex(TOKEN),
    }),
    connect: vi.fn(),
    disconnect: vi.fn(),
    health: vi.fn().mockResolvedValue(true),
  } as ISqlDatabase;
}

function makeRaw() {
  const chunks: Buffer[] = [];
  const listeners: Record<string, () => void> = {};
  const raw = {
    status: vi.fn(),
    write: vi.fn((chunk: Buffer) => {
      chunks.push(Buffer.from(chunk));
      return true;
    }),
    end: vi.fn(),
    destroy: vi.fn(),
    onClose: vi.fn((cb: () => void) => {
      listeners["close"] = cb;
    }),
  } as unknown as import("@gd-monorepo/ws-tunnel").IStreamSink;
  return { raw, chunks, listeners };
}

const waitFor = (cond: () => boolean, timeoutMs: number) =>
  new Promise<void>((resolve, reject) => {
    const start = Date.now();
    const tick = () => {
      if (cond()) return resolve();
      if (Date.now() - start > timeoutMs) return reject(new Error("waitFor timeout"));
      setTimeout(tick, 10);
    };
    tick();
  });

describe("Faz 3 uçtan uca tünel (K3.1-K3.3)", () => {
  let fieldWss: WebSocketServer;
  let fieldPort: number;
  let containerConnector: FieldConnector;
  let containerServer: ContainerSessionServer;
  let tunnelClient: TunnelClient;
  let fieldProxy: ContainerProxy;
  let fieldStore: FieldSessionStore;
  let gateway: ContainerSessionGateway;
  let tunnelProxy: TunnelProxy;
  let logger: TamperLogger;
  let sink: MemorySink;
  let auditInserts: Array<{ sql: string; params: unknown[] }>;
  let upstreamHttp: http.Server;
  let upstreamPort: number;
  let upstreamWs: WebSocketServer;
  const cleanup: Array<() => Promise<void> | void> = [];

  beforeEach(async () => {
    auditInserts = [];
    sink = new MemorySink();
    logger = new TamperLogger({
      signingKey: "integration-signing-key-0123456789",
      service: "field",
      sinks: [sink],
      batchSize: 1,
    });

    // --- konteyner upstream'leri: /api/* + / (SPA) + /ws/* (aynı port —
    // gerçek container web-service gibi HTTP ve WS tek sokette) ---
    upstreamWs = new WebSocketServer({ noServer: true });
    upstreamHttp = http.createServer((req, res) => {
      if (req.url?.startsWith("/api/data/latest")) {
        res.setHeader("content-type", "application/json");
        res.end(JSON.stringify({ voltage: 750 }));
      } else {
        res.setHeader("content-type", "text/html");
        res.end("<html>SPA</html>");
      }
    });
    upstreamHttp.on("upgrade", (request, socket, head) => {
      upstreamWs.handleUpgrade(request, socket, head, (ws) => {
        upstreamWs.emit("connection", ws, request);
      });
    });
    await new Promise<void>((resolve) => upstreamHttp.listen(0, "127.0.0.1", resolve));
    upstreamPort = (upstreamHttp.address() as { port: number }).port;

    upstreamWs.on("connection", (socket) => {
      socket.on("message", (data, isBinary) => {
        socket.send(data, { binary: isBinary });
      });
    });

    // --- field: ContainerProxy + gateway + tunnel proxy ---
    fieldWss = new WebSocketServer({ port: 0, host: "127.0.0.1" });
    await new Promise<void>((resolve) => fieldWss.on("listening", resolve));
    fieldPort = (fieldWss.address() as { port: number }).port;

    fieldProxy = new ContainerProxy(fakeSql(auditInserts));
    fieldWss.on("connection", (socket) => {
      void fieldProxy.registerContainer(CONTAINER_ID, socket, TOKEN);
    });

    fieldStore = new FieldSessionStore();
    const audit = new SessionAudit(fakeSql(auditInserts), logger);
    const gatewayChannel = new ContainerProxyFieldChannel(fieldProxy);
    gateway = new ContainerSessionGateway(
      gatewayChannel,
      fieldStore,
      audit,
      logger,
      { ackTimeoutMs: 3000 },
    );
    gateway.initialize();
    const proxyChannel = new ContainerProxyFieldChannel(fieldProxy);
    tunnelProxy = new TunnelProxy(proxyChannel, fieldStore, logger);
    tunnelProxy.initialize();

    // --- konteyner: FieldConnector + session + tunnel ---
    const store = new ContainerSessionStore(
      new JoseTokenSigner("container-secret-0123456789abcdef"),
    );
    containerConnector = new FieldConnector(
      {
        wsUrls: [`ws://127.0.0.1:${fieldPort}`],
        token: TOKEN,
        containerId: CONTAINER_ID,
        heartbeatIntervalMs: 1000,
        telemetryIntervalMs: 1000,
        registerTimeoutMs: 2000,
        livenessTimeoutMs: 10000,
      },
      new WsSocketClientFactory(),
      { snapshot: async () => [] },
      new ReconnectDelay({ baseMs: 200, maxMs: 500, jitterSpanMs: 0, jitter: () => 0 }),
    );
    containerServer = new ContainerSessionServer(containerConnector, store, logger);
    containerServer.start();
    tunnelClient = TunnelClient.create({
      webServiceUrl: `http://127.0.0.1:${upstreamPort}`,
      staticUrl: `http://127.0.0.1:${upstreamPort}`,
    });
    tunnelClient.attach(containerConnector);

    cleanup.push(
      () => containerServer.stop(),
      () => tunnelClient.stop(),
      async () => containerConnector.stop(),
      () => gateway.stop(),
      () => tunnelProxy.stop(),
      async () => fieldProxy.stop(),
      async () => logger.close(),
    );

    void containerConnector.start();
    await waitFor(() => containerConnector.fieldConnected(), 5000);
  });

  afterEach(async () => {
    for (const fn of cleanup.reverse()) await fn();
    cleanup.length = 0;
    await new Promise<void>((resolve) => upstreamHttp.close(() => resolve()));
    for (const socket of upstreamWs.clients) socket.terminate();
    await new Promise<void>((resolve) => upstreamWs.close(() => resolve()));
    for (const socket of fieldWss.clients) socket.terminate();
    await new Promise<void>((resolve) => fieldWss.close(() => resolve()));
  });

  it("K3.1: curl benzeri GET / → HTML akar (FIN ile biter)", async () => {
    const outcome = await gateway.openSession({
      fieldId: "f-1",
      containerId: CONTAINER_ID,
      user,
    });
    expect(outcome.isOk()).toBe(true);
    const session = outcome.unwrap();
    fieldStore.register({
      sessionId: session.sessionId,
      containerId: CONTAINER_ID,
      token: session.token,
      user,
      containerRole: session.containerRole,
      createdAt: 0,
      lastActivityAt: 0,
      bytesIn: 0,
      bytesOut: 0,
    });

    const { raw, chunks } = makeRaw();
    await tunnelProxy.startHttpStream({
      session: fieldStore.byToken(session.token)!,
      method: "GET",
      path: "/",
      headers: { accept: "text/html" },
      raw,
    });
    await waitFor(() => raw.end.mock.calls.length > 0, 5000);
    expect(raw.status).toHaveBeenCalledWith(200, expect.objectContaining({ "content-type": "text/html" }));
    expect(Buffer.concat(chunks).toString()).toBe("<html>SPA</html>");
  });

  it("K3.2: GET /api/data/latest → JSON akar", async () => {
    const outcome = await gateway.openSession({
      fieldId: "f-1",
      containerId: CONTAINER_ID,
      user,
    });
    const session = outcome.unwrap();
    fieldStore.register({
      sessionId: session.sessionId,
      containerId: CONTAINER_ID,
      token: session.token,
      user,
      containerRole: session.containerRole,
      createdAt: 0,
      lastActivityAt: 0,
      bytesIn: 0,
      bytesOut: 0,
    });

    const { raw, chunks } = makeRaw();
    await tunnelProxy.startHttpStream({
      session: fieldStore.byToken(session.token)!,
      method: "GET",
      path: "/api/data/latest",
      headers: {},
      raw,
    });
    await waitFor(() => raw.end.mock.calls.length > 0, 5000);
    expect(JSON.parse(Buffer.concat(chunks).toString())).toEqual({ voltage: 750 });
  });

  it("K3.2: /ws köprüsü çift yönlü WS_OP mesajı taşır", async () => {
    const outcome = await gateway.openSession({
      fieldId: "f-1",
      containerId: CONTAINER_ID,
      user,
    });
    const session = outcome.unwrap();
    fieldStore.register({
      sessionId: session.sessionId,
      containerId: CONTAINER_ID,
      token: session.token,
      user,
      containerRole: session.containerRole,
      createdAt: 0,
      lastActivityAt: 0,
      bytesIn: 0,
      bytesOut: 0,
    });

    const browserReceived: string[] = [];
    const browserSocket = {
      sent: [] as Buffer[],
      send: (data: Buffer | string, _options?: { binary?: boolean }) => {
        browserReceived.push(Buffer.from(data as Buffer).toString());
      },
      close: vi.fn(),
    };
    const streamId = await tunnelProxy.startWsBridge({
      session: fieldStore.byToken(session.token)!,
      path: `/ws/telemetry`,
      browserSocket: browserSocket as never,
    });
    expect(streamId).toBeDefined();

    tunnelProxy.sendWsToContainer(streamId!, Buffer.from("subscribe"), false);
    await waitFor(() => browserReceived.length >= 1, 5000);
    expect(browserReceived[0]).toBe("subscribe");
  });

  it("K3.3: session_audit INSERT + session_open security logu", async () => {
    const outcome = await gateway.openSession({
      fieldId: "f-1",
      containerId: CONTAINER_ID,
      user,
    });
    expect(outcome.isOk()).toBe(true);

    await waitFor(() => auditInserts.length >= 1, 5000);
    const insert = auditInserts[0];
    expect(insert.sql).toContain("INSERT INTO session_audit");
    expect(insert.params).toContain("container-int");
    expect(insert.params).toContain("operator");

    await waitFor(
      () => sink.events.some((event) => event.eventCode === "session_open"),
      5000,
    );
    expect(
      sink.events.some((event) => event.category === "security"),
    ).toBe(true);
  });
});
