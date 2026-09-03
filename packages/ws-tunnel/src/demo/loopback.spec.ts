import { describe, it, expect, afterEach, vi } from "vitest";
import http from "node:http";
import { WebSocketServer, type WebSocket } from "ws";

import { FieldConnector } from "../connector";
import { WsSocketClientFactory } from "../channel";
import { ReconnectDelay } from "../connector";
import { TunnelClient } from "../client";
import { ContainerSessionStore, ContainerSessionServer } from "../session";
import { FieldSessionStore, ContainerSessionGateway, TunnelProxy } from "../proxy";
import type { IStreamSink, IAuditSink } from "../";
import { FieldHarness } from "./field-harness";
import { JoseSignerForTests } from "../session/__test-helpers__/jose-signer";

/**
 * Loopback uçtan uca — paketin KENDİ KENDİNE YETERLİLİK kanıtı.
 * Monorepo'ya hiç değmez: ContainerProxy/Fastify/PG YOKTUR; field tarafı
 * `FieldHarness` (paket içi), konteyner tarafı FieldConnector + TunnelClient,
 * field tarafı Gateway + TunnelProxy aynı gerçek WS kanalında loopback.
 */
const CONTAINER_ID = "container-loop";
const TOKEN = "loopback-token-0123456789abcdef";

const waitFor = async (fn: () => boolean, timeoutMs = 5000): Promise<boolean> => {
  const start = Date.now();
  for (;;) {
    if (fn()) return true;
    if (Date.now() - start > timeoutMs) return false;
    await new Promise((r) => setTimeout(r, 10));
  }
};

function makeSink(): { sink: IStreamSink; chunks: Buffer[] } {
  const chunks: Buffer[] = [];
  const sink = {
    status: vi.fn(),
    write: (chunk: Buffer) => chunks.push(Buffer.from(chunk)),
    end: vi.fn(),
    destroy: vi.fn(),
    onClose: vi.fn(),
  } as unknown as IStreamSink;
  return { sink, chunks };
}

const audit = {
  open: vi.fn().mockResolvedValue(undefined),
  close: vi.fn().mockResolvedValue(undefined),
} as IAuditSink;

interface Upstream {
  port: number;
  close(): Promise<void>;
}

/** Loopback upstream: SPA HTML + API JSON (http) + WS echo (aynı portta). */
async function startUpstream(): Promise<Upstream> {
  const httpServer = http.createServer((req, res) => {
    if (req.url === "/") {
      res.writeHead(200, { "content-type": "text/html" });
      res.end("<html><body>KONTEYNER-SPA</body></html>");
    } else if (req.url?.startsWith("/api/data/latest")) {
      res.writeHead(200, { "content-type": "application/json" });
      res.end('{"voltage":750}');
    } else {
      res.writeHead(404);
      res.end("not found");
    }
  });
  const wss = new WebSocketServer({ server: httpServer });
  wss.on("connection", (socket) => {
    socket.on("message", (raw, isBinary) => {
      socket.send(raw as Buffer, { binary: isBinary });
    });
  });
  await new Promise<void>((resolve) => httpServer.listen(0, () => resolve()));
  const address = httpServer.address() as { port: number };
  return {
    port: address.port,
    close: async () => {
      await new Promise<void>((resolve) => {
        for (const client of wss.clients) client.terminate();
        wss.close(() => {
          httpServer.close(() => resolve());
        });
      });
    },
  };
}

describe("loopback uçtan uca (paket içi — ContainerProxy'siz)", () => {
  let harness: FieldHarness;
  let upstream: Upstream;
  let connector: FieldConnector;
  let tunnelClient: TunnelClient;
  let gateway: ContainerSessionGateway;
  let tunnelProxy: TunnelProxy;

  afterEach(async () => {
    connector?.stop();
    tunnelClient?.stop();
    gateway?.stop();
    tunnelProxy?.stop();
    await harness?.close();
    await upstream?.close();
  });

  async function setup(): Promise<void> {
    upstream = await startUpstream();
    const base = `http://127.0.0.1:${upstream.port}`;
    harness = new FieldHarness();
    const port = await harness.start();

    connector = new FieldConnector(
      {
        wsUrls: [`ws://127.0.0.1:${port}/ws/container`],
        token: TOKEN,
        containerId: CONTAINER_ID,
        heartbeatIntervalMs: 200,
        telemetryIntervalMs: 200,
        registerTimeoutMs: 3000,
        livenessTimeoutMs: 60000,
      },
      new WsSocketClientFactory(),
      { snapshot: async () => [] },
      new ReconnectDelay({ baseMs: 50, maxMs: 200, jitterSpanMs: 0, jitter: () => 0 }),
    );

    const sessionStore = new ContainerSessionStore(
      new JoseSignerForTests("container-secret-loopback-0123456789"),
    );
    const sessionServer = new ContainerSessionServer(connector, sessionStore, undefined);
    sessionServer.start();

    tunnelClient = TunnelClient.create({ webServiceUrl: base, staticUrl: base });
    tunnelClient.attach(connector);

    const fieldStore = new FieldSessionStore();
    gateway = new ContainerSessionGateway(harness, fieldStore, audit, undefined, {
      ackTimeoutMs: 3000,
    });
    gateway.initialize();
    tunnelProxy = new TunnelProxy(harness, fieldStore, undefined);
    tunnelProxy.initialize();

    await connector.start();
  }

  it("FieldConnector field'a kaydolur (register-ack → connected)", async () => {
    await setup();
    expect(await waitFor(() => connector.fieldConnected())).toBe(true);
    expect(connector.state()).toBe("connected");
  });

  it("open-session → ack + kayıt + audit", async () => {
    await setup();
    expect(await waitFor(() => connector.fieldConnected())).toBe(true);
    const result = await gateway.openSession({
      fieldId: "f-loop",
      containerId: CONTAINER_ID,
      user: { id: "u-1", username: "operator", role: "teknik" },
    });
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.unwrap().expiresInSec).toBe(4 * 60 * 60);
      expect(audit.open).toHaveBeenCalledWith(
        expect.objectContaining({ containerId: CONTAINER_ID }),
      );
    }
  });

  it("GET / → SPA HTML akar (FIN ile biter)", async () => {
    await setup();
    expect(await waitFor(() => connector.fieldConnected())).toBe(true);
    const outcome = await gateway.openSession({
      fieldId: "f-loop",
      containerId: CONTAINER_ID,
      user: { id: "u-1", username: "operator", role: "teknik" },
    });
    expect(outcome.isOk()).toBe(true);
    const { sink, chunks } = makeSink();
    await tunnelProxy.startHttpStream({
      session: gateway.sessionByToken(outcome.unwrap().token)!,
      method: "GET",
      path: "/",
      headers: {},
      raw: sink,
    });
    expect(await waitFor(() => chunks.length > 0)).toBe(true);
    expect(sink.status).toHaveBeenCalledWith(200, expect.objectContaining({ "content-type": "text/html" }));
    expect(Buffer.concat(chunks).toString()).toContain("KONTEYNER-SPA");
  });

  it("GET /api/data/latest → JSON akar (K3.2)", async () => {
    await setup();
    expect(await waitFor(() => connector.fieldConnected())).toBe(true);
    const outcome = await gateway.openSession({
      fieldId: "f-loop",
      containerId: CONTAINER_ID,
      user: { id: "u-1", username: "operator", role: "teknik" },
    });
    expect(outcome.isOk()).toBe(true);
    const { sink, chunks } = makeSink();
    await tunnelProxy.startHttpStream({
      session: gateway.sessionByToken(outcome.unwrap().token)!,
      method: "GET",
      path: "/api/data/latest",
      headers: {},
      raw: sink,
    });
    expect(await waitFor(() => chunks.length > 0)).toBe(true);
    expect(Buffer.concat(chunks).toString()).toBe('{"voltage":750}');
  });

  it("/ws köprüsü çift yönlü WS_OP mesajı taşır", async () => {
    await setup();
    expect(await waitFor(() => connector.fieldConnected())).toBe(true);
    const outcome = await gateway.openSession({
      fieldId: "f-loop",
      containerId: CONTAINER_ID,
      user: { id: "u-1", username: "operator", role: "teknik" },
    });
    expect(outcome.isOk()).toBe(true);
    const received: Buffer[] = [];
    const browserSocket = {
      send: (data: Buffer | string) => {
        received.push(Buffer.from(data));
      },
      close: vi.fn(),
    };
    const streamId = await tunnelProxy.startWsBridge({
      session: gateway.sessionByToken(outcome.unwrap().token)!,
      path: "/ws/echo",
      browserSocket,
    });
    expect(streamId).toBeDefined();
    tunnelProxy.sendWsToContainer(streamId!, Buffer.from("subscribe"), false);
    expect(await waitFor(() => received.length === 1)).toBe(true);
    expect(received[0]?.toString()).toBe("subscribe");
    tunnelProxy.closeWs(streamId!, "test-end");
  });
});
