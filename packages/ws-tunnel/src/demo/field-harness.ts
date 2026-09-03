import { WebSocketServer, WebSocket } from "ws";
import type { IFieldChannel } from "../channel";

export interface FieldHarnessOptions {
  /** register-ack gecikmesi (ms) — gerçek ağ gecikmesini taklit eder. */
  registerAckDelayMs?: number;
}

/**
 * FieldHarness — ws-tunnel'ın paket içi demo/örnek "field" ucu.
 *
 * Gerçek `ws` sunucusu; `register` frame'ine `register-ack` ile yanıt verir,
 * text kontrol mesajlarını ve binary frame'leri `IFieldChannel` üzerinden
 * yayınlar. ContainerProxy/Fastify/PG bağımlılığı YOKTUR — paketin kendi
 * kendine yeterliliğinin kanıtı (README örneği + `loopback.spec.ts`).
 */
export class FieldHarness implements IFieldChannel {
  private wss?: WebSocketServer;
  private sockets = new Map<string, WebSocket>();
  private controlSubs = new Set<(cid: string, m: unknown) => void>();
  private binarySubs = new Set<(cid: string, d: Buffer) => void>();
  private readonly delayMs: number;

  constructor(options: FieldHarnessOptions = {}) {
    this.delayMs = options.registerAckDelayMs ?? 0;
  }

  /** Sunucuyu başlatır — dinlenen portu döner (komut). */
  async start(): Promise<number> {
    const wss = new WebSocketServer({ port: 0 });
    this.wss = wss;
    wss.on("connection", (ws) => {
      let containerId: string | undefined;
      ws.on("message", (raw, isBinary) => {
        if (isBinary) {
          if (containerId !== undefined) {
            this.binarySubs.forEach((cb) => cb(containerId!, raw as Buffer));
          }
          return;
        }
        let msg: unknown;
        try {
          msg = JSON.parse(raw.toString());
        } catch {
          return;
        }
        const type = (msg as { type?: unknown }).type;
        if (type === "register") {
          containerId = (msg as { containerId?: string }).containerId;
          if (containerId === undefined) return;
          const ack = () => {
            if (ws.readyState !== WebSocket.OPEN) return;
            ws.send(
              JSON.stringify({
                type: "register-ack",
                status: "ok",
                serverTime: new Date().toISOString(),
              }),
            );
            this.sockets.set(containerId!, ws);
          };
          if (this.delayMs > 0) {
            setTimeout(ack, this.delayMs);
          } else {
            ack();
          }
          return;
        }
        if (containerId !== undefined) {
          this.controlSubs.forEach((cb) => cb(containerId!, msg));
        }
      });
      ws.on("close", () => {
        if (containerId !== undefined) this.sockets.delete(containerId);
      });
    });
    await new Promise<void>((resolve) => wss.once("listening", () => resolve()));
    return (wss.address() as { port: number }).port;
  }

  /** Sunucuyu kapatır (komut). */
  async close(): Promise<void> {
    await new Promise<void>((resolve) => {
      this.wss?.close(() => resolve());
    });
  }

  // --- IFieldChannel ---

  sendControl(containerId: string, message: unknown): void {
    const ws = this.sockets.get(containerId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  sendBinary(containerId: string, data: Buffer): void {
    const ws = this.sockets.get(containerId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(data);
    }
  }

  onControlMessage(
    subscriber: (containerId: string, message: unknown) => void,
  ): () => void {
    this.controlSubs.add(subscriber);
    return () => this.controlSubs.delete(subscriber);
  }

  onBinaryFrame(
    subscriber: (containerId: string, data: Buffer) => void,
  ): () => void {
    this.binarySubs.add(subscriber);
    return () => this.binarySubs.delete(subscriber);
  }

  isConnected(containerId: string): boolean {
    const ws = this.sockets.get(containerId);
    return ws !== undefined && ws.readyState === WebSocket.OPEN;
  }
}
