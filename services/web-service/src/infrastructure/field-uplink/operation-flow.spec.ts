import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { WebSocketServer, WebSocket } from "ws";
import type { AddressInfo } from "node:net";
import {
  TunnelConnector,
  WsSocketClientFactory,
  ReconnectDelay,
} from "@gd-monorepo/ws-tunnel";
import type {
  OperationExecuteMessage,
  OperationResultMessage,
} from "@gd-monorepo/ws-tunnel";
import type { OperationExecutor } from "@gd-monorepo/platform-commands";
import type { TamperLogger } from "@gd-monorepo/tamper-logger";
import { OperationResponder } from "./operation-responder";

/**
 * K1 — operation-execute → yürütme → operation-result uçtan uca (gerçek WS):
 *
 * Boss hub'ı = gerçek WebSocketServer; field tarafı = TunnelConnector
 * (uplink) + OperationResponder + fake yürütücü. Tek TCP loopback kanalı.
 *
 * - Hub register'a register-ack (ok) döner (connector registered→connected).
 * - Hub `operation-execute` gönderir → connector subscriber → responder →
 *   yürütücü → `operation-result` AYNI kanaldan hub'a döner (korelasyon:
 *   operationId).
 * - Kopukluk/kademeli: bilinmeyen mesaj tipi sessiz yok sayılır (kanal açık
 *   kalır).
 */

interface BossHub {
  wss: WebSocketServer;
  url: string;
  sockets: WebSocket[];
  results: OperationResultMessage[];
  send: (frame: unknown) => void;
}

function makeBossHub(): Promise<BossHub> {
  return new Promise((resolve) => {
    const results: OperationResultMessage[] = [];
    const sockets: WebSocket[] = [];
    const wss = new WebSocketServer({ host: "127.0.0.1", port: 0 });
    wss.on("connection", (ws) => {
      sockets.push(ws);
      ws.on("message", (data) => {
        const text = data.toString();
        let message: unknown;
        try {
          message = JSON.parse(text);
        } catch {
          return;
        }
        const type = (message as { type?: string } | null)?.type;
        if (type === "register") {
          ws.send(
            JSON.stringify({
              type: "register-ack",
              status: "ok",
              serverTime: new Date().toISOString(),
            }),
          );
          return;
        }
        if (type === "operation-result") {
          results.push(message as OperationResultMessage);
        }
      });
    });
    wss.on("listening", () => {
      const port = (wss.address() as AddressInfo).port;
      resolve({
        wss,
        url: `ws://127.0.0.1:${port}/ws/field`,
        sockets,
        results,
        send: (frame: unknown) => {
          for (const ws of sockets) {
            ws.send(JSON.stringify(frame));
          }
        },
      });
    });
  });
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

describe("K1 — operasyon akışı uçtan uca (gerçek WS)", () => {
  let hub: BossHub;
  let connector: TunnelConnector;
  let responder: OperationResponder;
  let executorExecute: ReturnType<typeof vi.fn>;
  const cleanup: Array<() => Promise<void> | void> = [];

  beforeEach(async () => {
    hub = await makeBossHub();
    cleanup.push(() => hub.wss.close());

    connector = new TunnelConnector(
      {
        wsUrls: [hub.url],
        peerId: "field-1",
        peerType: "field",
        token: "field-uplink-token",
        registerTimeoutMs: 5000,
        heartbeatIntervalMs: 15_000,
        telemetryIntervalMs: 15_000,
        livenessTimeoutMs: 60_000,
      },
      new WsSocketClientFactory(),
      {
        async snapshot() {
          return [];
        },
      },
      new ReconnectDelay({
        baseMs: 1000,
        maxMs: 60000,
        jitterSpanMs: 1000,
        jitter: Math.random,
      }),
    );
    cleanup.push(() => connector.stop());

    executorExecute = vi.fn(async () => ({
      runId: "run-1",
      kind: "operation" as const,
      name: "field_charge",
      status: "completed" as const,
      outcomes: [
        { stepIndex: 0, system: "container-1", maneuver: "bsc_prepare", success: true },
      ],
    }));
    responder = new OperationResponder(
      connector,
      { execute: executorExecute } as unknown as OperationExecutor,
      undefined as unknown as TamperLogger,
    );
    responder.start();
    cleanup.push(() => responder.stop());

    await connector.start();
    await waitFor(() => connector.state() === "connected", 5000);
  });

  afterEach(async () => {
    for (const fn of cleanup.reverse()) {
      await fn();
    }
    cleanup.length = 0;
  });

  it("operation-execute → yürütücü → operation-result aynı kanaldan döner", async () => {
    const frame: OperationExecuteMessage = {
      type: "operation-execute",
      operationId: "op-k1",
      name: "field_charge",
      params: { powerKw: 200 },
      traceId: "auto:boss:k1",
    };
    hub.send(frame);

    await waitFor(() => hub.results.length === 1, 5000);
    expect(hub.results[0]).toEqual({
      type: "operation-result",
      operationId: "op-k1",
      status: "completed",
      results: [
        { step: 0, system: "container-1", maneuver: "bsc_prepare", ok: true },
      ],
    });
    expect(executorExecute).toHaveBeenCalledWith(
      "operation",
      "field_charge",
      { powerKw: 200 },
      {
        trigger: "boss:op-k1",
        createdBy: "boss",
        traceId: "auto:boss:k1",
      },
    );
  });

  it("bilinmeyen kontrol mesajı sessiz yok sayılır — kanal AÇIK kalır", async () => {
    hub.send({ type: "bogus-frame", x: 1 });
    await new Promise((r) => setTimeout(r, 100));
    expect(connector.state()).toBe("connected");
    expect(executorExecute).not.toHaveBeenCalled();

    // kanal sağlıklı: sonraki geçerli istek hâlâ yanıtlanır
    hub.send({
      type: "operation-execute",
      operationId: "op-k2",
      name: "field_charge",
    });
    await waitFor(() => hub.results.length === 1, 5000);
    expect(hub.results[0]!.operationId).toBe("op-k2");
  });
});
