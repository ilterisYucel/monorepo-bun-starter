import { describe, it, expect, afterEach } from "vitest";
import { WebSocketServer, type WebSocket } from "ws";
import { FieldConnector } from "./field-connector";
import { WsSocketClientFactory } from "../channel";
import { ReconnectDelay } from "./reconnect-delay";
import type { ISnapshotSource } from "../snapshot";
import type { TunnelTelemetryPoint } from "../types";

/**
 * T2.5 / K2.1 — FieldConnector ↔ field WS integration (gerçek ws sunucusu):
 * - K2.1: açılıştan (start) connected'a < 5 sn — gerçek WS üzerinde ölçülür.
 * - register → register-ack → heartbeat → telemetry snapshot akışı uçtan uca.
 * - T2.5: register-ack.config + config-update frame'i aralıkları CANLI değiştirir
 *   (restart yok); geçersiz config eski aralığı korur.
 * - WS kopunca backoff → yeniden bağlanma; stop() → yeniden bağlanma yok.
 *
 * Kısa aralıklar (100 ms) testi hızlı + deterministik tutar; protokol zaman
 * sabitleri unit testlerde (fake timers) ayrıca sabitlenmiştir.
 */

interface FieldServer {
  wss: WebSocketServer;
  port: number;
  connections: WebSocket[];
  registers: unknown[];
  heartbeats: number[];
  telemetryFrames: Array<{ data: TunnelTelemetryPoint[] }>;
  setOnRegister(cb: (ws: WebSocket) => void): void;
}

async function startFieldServer(): Promise<FieldServer> {
  const wss = new WebSocketServer({ port: 0 });
  const connections: WebSocket[] = [];
  const registers: unknown[] = [];
  const heartbeats: number[] = [];
  const telemetryFrames: Array<{ data: TunnelTelemetryPoint[] }> = [];
  let onRegister: ((ws: WebSocket) => void) | undefined;

  wss.on("connection", (ws) => {
    connections.push(ws);
    ws.on("message", (raw) => {
      const msg = JSON.parse(raw.toString());
      if (msg.type === "register") {
        registers.push(msg);
        onRegister?.(ws);
      } else if (msg.type === "heartbeat") {
        heartbeats.push(Date.now());
      } else if (msg.type === "telemetry") {
        telemetryFrames.push(msg);
      }
    });
  });

  await new Promise<void>((resolve) => wss.on("listening", () => resolve()));
  const address = wss.address() as { port: number };
  return {
    wss,
    port: address.port,
    connections,
    registers,
    heartbeats,
    telemetryFrames,
    setOnRegister: (cb) => {
      onRegister = cb;
    },
  };
}

async function waitFor(cond: () => boolean, timeoutMs: number): Promise<void> {
  const start = Date.now();
  while (!cond()) {
    if (Date.now() - start > timeoutMs) {
      throw new Error("waitFor timeout");
    }
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
}

const sampleSnapshot: ISnapshotSource = {
  snapshot: async () => [
    {
      deviceId: "bsc-1",
      name: "Voltage",
      value: 750,
      description: "",
      unit: "V",
      timestamp: new Date().toISOString(),
    },
  ],
};

function makeConnector(port: number): FieldConnector {
  return new FieldConnector(
    {
      wsUrls: [`ws://127.0.0.1:${port}`],
      token: "service-token-abcdef",
      containerId: "container-1",
      heartbeatIntervalMs: 100,
      telemetryIntervalMs: 100,
      registerTimeoutMs: 2000,
      livenessTimeoutMs: 10000,
    },
    new WsSocketClientFactory(),
    sampleSnapshot,
    new ReconnectDelay({ baseMs: 200, maxMs: 1000, jitterSpanMs: 0, jitter: () => 0 }),
  );
}

function ack(ws: WebSocket, config?: Record<string, unknown>): void {
  ws.send(
    JSON.stringify({
      type: "register-ack",
      status: "ok",
      serverTime: new Date().toISOString(),
      ...(config ? { config } : {}),
    }),
  );
}

describe("FieldConnector integration (gerçek WS — T2.5/K2.1)", () => {
  const servers: WebSocketServer[] = [];
  const connectors: FieldConnector[] = [];

  async function setup(): Promise<FieldServer> {
    const server = await startFieldServer();
    servers.push(server.wss);
    return server;
  }

  afterEach(async () => {
    for (const connector of connectors.splice(0)) {
      await connector.stop();
    }
    for (const wss of servers.splice(0)) {
      await new Promise<void>((resolve) => wss.close(() => resolve()));
    }
  });

  it("K2.1: start → connected < 5 sn (gerçek WS, ölçümlü)", async () => {
    const server = await setup();
    server.setOnRegister((ws) => ack(ws));

    const connector = makeConnector(server.port);
    connectors.push(connector);

    const start = Date.now();
    void connector.start();
    await waitFor(() => connector.fieldConnected(), 5000);
    const elapsed = Date.now() - start;

    expect(elapsed).toBeLessThan(5000);
    expect(server.registers[0]).toMatchObject({
      type: "register",
      containerId: "container-1",
      protocolVersion: 1,
    });
    expect(connector.state()).toBe("connected");
  });

  it("heartbeat + telemetry snapshot gerçek WS üzerinden akar", async () => {
    const server = await setup();
    server.setOnRegister((ws) => ack(ws));

    const connector = makeConnector(server.port);
    connectors.push(connector);
    void connector.start();

    await waitFor(
      () => server.heartbeats.length >= 2 && server.telemetryFrames.length >= 1,
      5000,
    );
    expect(server.telemetryFrames[0].data[0]).toMatchObject({
      deviceId: "bsc-1",
      name: "Voltage",
    });
  });

  it("T2.5: register-ack.config aralığı canlı uygular", async () => {
    const server = await setup();
    server.setOnRegister((ws) => ack(ws, { heartbeatIntervalMs: 100000 }));

    const connector = makeConnector(server.port);
    connectors.push(connector);
    void connector.start();

    // connected sonrası 600 ms'de yeni heartbeat beklenmez — yalnızca ack
    // anında atılan İLK heartbeat vardır (aralık 100 sn'ye çıktı)
    await waitFor(() => connector.fieldConnected(), 5000);
    await new Promise((resolve) => setTimeout(resolve, 600));
    expect(server.heartbeats).toHaveLength(1);
  });

  it("T2.5: config-update frame'i heartbeat aralığını canlı değiştirir", async () => {
    const server = await setup();
    server.setOnRegister((ws) => ack(ws));

    const connector = makeConnector(server.port);
    connectors.push(connector);
    void connector.start();

    await waitFor(() => server.heartbeats.length >= 2, 5000);
    const before = server.heartbeats.length;

    const ws = server.connections[0];
    ws.send(
      JSON.stringify({
        type: "config-update",
        config: { heartbeatIntervalMs: 100000 },
      }),
    );
    // eski aralık (100 ms) devam etseydi ~6 yeni heartbeat gelirdi
    await new Promise((resolve) => setTimeout(resolve, 600));
    expect(server.heartbeats.length).toBe(before);
  });

  it("T2.5: geçersiz config-update eski aralığı korur", async () => {
    const server = await setup();
    server.setOnRegister((ws) => ack(ws));

    const connector = makeConnector(server.port);
    connectors.push(connector);
    void connector.start();

    await waitFor(() => server.heartbeats.length >= 1, 5000);
    const before = server.heartbeats.length;

    server.connections[0].send(
      JSON.stringify({
        type: "config-update",
        config: { heartbeatIntervalMs: -5 },
      }),
    );
    await waitFor(() => server.heartbeats.length > before, 2000);
  });

  it("WS kopunca backoff → yeniden bağlanır", async () => {
    const server = await setup();
    server.setOnRegister((ws) => ack(ws));

    const connector = makeConnector(server.port);
    connectors.push(connector);
    void connector.start();

    await waitFor(() => connector.fieldConnected(), 5000);
    server.connections[0].close();
    await waitFor(() => server.connections.length >= 2, 5000);
    expect(connector.fieldConnected()).toBe(true);
  });

  it("stop() sonrası yeniden bağlanma olmaz", async () => {
    const server = await setup();
    server.setOnRegister((ws) => ack(ws));

    const connector = makeConnector(server.port);
    connectors.push(connector);
    void connector.start();

    await waitFor(() => connector.fieldConnected(), 5000);
    await connector.stop();
    await new Promise((resolve) => setTimeout(resolve, 1500));
    expect(server.connections).toHaveLength(1);
    expect(connector.state()).toBe("offline");
  });
});
