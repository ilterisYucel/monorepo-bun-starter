import { WebSocket } from "ws";
import type { ISocketClient, ISocketClientFactory } from "./interface";

const READY_STATE_MAP = {
  [WebSocket.CONNECTING]: "connecting",
  [WebSocket.OPEN]: "open",
  [WebSocket.CLOSING]: "closing",
  [WebSocket.CLOSED]: "closed",
} as const;

/**
 * WsSocketClient — `ws` paketi istemcisini `ISocketClient`'a uyarlar (Adapter).
 * FieldConnector bu sözleşme üzerinden çalışır; testlerde fake soket enjekte
 * edilir. `unexpected-response` (pre-upgrade ret — 401/403) `onRejected`'a
 * çevrilir; statusCode yoksa 0 iletilir.
 */
export class WsSocketClient implements ISocketClient {
  constructor(private readonly raw: WebSocket) {}

  send(data: string): void {
    this.raw.send(data);
  }

  sendBinary(data: Uint8Array): void {
    this.raw.send(Buffer.from(data));
  }

  ping(): void {
    this.raw.ping();
  }

  close(): void {
    this.raw.close();
  }

  onOpen(callback: () => void): void {
    this.raw.on("open", callback);
  }

  onMessage(callback: (raw: string) => void): void {
    this.raw.on("message", (data, isBinary) => {
      if (isBinary) return;
      callback(data.toString());
    });
  }

  onBinaryMessage(callback: (data: Buffer) => void): void {
    this.raw.on("message", (data, isBinary) => {
      if (!isBinary) return;
      callback(Buffer.from(data as Buffer));
    });
  }

  onClose(callback: () => void): void {
    this.raw.on("close", callback);
  }

  onError(callback: (error: Error) => void): void {
    this.raw.on("error", callback);
  }

  onPong(callback: () => void): void {
    this.raw.on("pong", callback);
  }

  onRejected(callback: (statusCode: number) => void): void {
    this.raw.on("unexpected-response", (_request, response) => {
      callback(response.statusCode ?? 0);
    });
  }

  readyState(): "connecting" | "open" | "closing" | "closed" {
    return (
      READY_STATE_MAP[this.raw.readyState as keyof typeof READY_STATE_MAP] ??
      "closed"
    );
  }
}

/**
 * WsSocketClientFactory — `ws` WebSocket üreticisi. Creator testlerde fake
 * enjekte edilir; üretimde varsayılan creator gerçek `ws` istemcisini kurar.
 */
export class WsSocketClientFactory implements ISocketClientFactory {
  private readonly creator: (
    url: string,
    options: { headers: Record<string, string> },
  ) => WebSocket;

  // ELEGANT-EXCEPTION: varsayılan creator parametresi — üretim kodu açıkça
  // enjekte etmez; `ws` constructor'ı doğrudan kurulur (AlertNotifier deseni).
  constructor(
    creator?: (
      url: string,
      options: { headers: Record<string, string> },
    ) => WebSocket,
  ) {
    this.creator =
      creator ?? ((url, options) => new WebSocket(url, options));
  }

  create(url: string, headers: Record<string, string>): ISocketClient {
    return new WsSocketClient(this.creator(url, { headers }));
  }
}
