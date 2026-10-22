import { WebSocket } from "ws";

/** ConsumerRelay yapılandırması. */
export interface ConsumerRelayConfig {
  /** Hub `/ws/consumer` URL'i (ws:// veya wss://). */
  url: string;
  /** Consumer token (peer token'ından AYRI). */
  token: string;
  reconnectBaseMs?: number;
  reconnectMaxMs?: number;
}

type MessageHandler = (peerId: string, message: unknown) => void;

/**
 * ConsumerRelay — hub `/ws/consumer` bağlantısı.
 *
 * Peer'dan gelen opak mesajları `{ peerId, message }` zarfından çözüp
 * abonelere iletir; kopunca üstel backoff ile yeniden bağlanır. Hub-servis
 * domain mesajlarını yorumlamaz.
 */
export class ConsumerRelay {
  private socket?: WebSocket;
  private attempt = 0;
  private stopped = true;
  private timer?: ReturnType<typeof setTimeout>;
  private readonly handlers = new Set<MessageHandler>();

  constructor(private readonly config: ConsumerRelayConfig) {}

  start(): void {
    this.stopped = false;
    this.connect();
  }

  stop(): void {
    this.stopped = true;
    if (this.timer) clearTimeout(this.timer);
    this.timer = undefined;
    this.socket?.close();
    this.socket = undefined;
  }

  isOpen(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  onMessage(handler: MessageHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  private connect(): void {
    if (this.stopped) return;
    const socket = new WebSocket(this.config.url, {
      headers: { authorization: `Bearer ${this.config.token}` },
    });
    this.socket = socket;

    socket.on("open", () => {
      this.attempt = 0;
    });
    socket.on("message", (raw: Buffer) => {
      let frame: unknown;
      try {
        frame = JSON.parse(raw.toString());
      } catch {
        return;
      }
      const peerId = (frame as { peerId?: unknown }).peerId;
      if (typeof peerId !== "string") return;
      const message = (frame as { message?: unknown }).message;
      for (const handler of this.handlers) handler(peerId, message);
    });
    socket.on("close", () => {
      if (this.socket === socket) {
        this.socket = undefined;
        this.scheduleReconnect();
      }
    });
    socket.on("error", () => {
      // close olayı yeniden bağlanmayı yönetir
    });
  }

  private scheduleReconnect(): void {
    if (this.stopped) return;
    const base = this.config.reconnectBaseMs ?? 500;
    const max = this.config.reconnectMaxMs ?? 10_000;
    const delay = Math.min(max, base * 2 ** this.attempt);
    this.attempt += 1;
    this.timer = setTimeout(() => this.connect(), delay);
  }
}
