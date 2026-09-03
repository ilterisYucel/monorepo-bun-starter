import { FrameCodec, FLAG_FIN, FLAG_RST, FLAG_WS_OP, WS_OPCODE } from "../codec";
import type { TunnelFrame } from "../codec";
import type { StreamOpenMessage, StreamOpenAckMessage, StreamWindowMessage, StreamCloseMessage } from "../protocol";
import { WsSocketClientFactory } from "../channel";
import type { ISocketClientFactory, ISocketClient, ITunnelChannel } from "../channel";

/** TunnelClient yapılandırması — opsiyonel alanlar testlerde enjekte edilir. */
export interface TunnelClientConfig {
  /** `/api/*`, `/ws/*` upstream'i (container tier web-service). */
  webServiceUrl: string;
  /** SPA + assets upstream'i (container nginx). */
  staticUrl: string;
  /** Akış kredisi pencere boyutu (tasarım §5.2: 256 KiB). */
  windowSize?: number;
  /** Eşzamanlı akış tavanı (tasarım §5.6: 16). */
  maxStreams?: number;
  /** Frame parça boyutu (tasarım §5.2: ≤64 KiB). */
  chunkSize?: number;
  /** İstek gövdesi tavanı (POST/PUT) — aşımı RST + kapatma. */
  maxRequestBody?: number;
  /** Akış boşta kalma süresi (ms) — §12.4 her stream için idle timeout. */
  idleTimeoutMs?: number;
  /** Akış azami yaşı (ms) — §12.4 max yaş. */
  maxAgeMs?: number;
  /** Sweep aralığı (ms). */
  sweepIntervalMs?: number;
  /** Loopback WS üretici — testlerde fake; üretimde `ws`. */
  socketFactory?: ISocketClientFactory;
}

const DEFAULT_WINDOW_SIZE = 256 * 1024;
const DEFAULT_MAX_STREAMS = 16;
const DEFAULT_CHUNK_SIZE = 64 * 1024;
const DEFAULT_MAX_REQUEST_BODY = 1024 * 1024;
const DEFAULT_IDLE_TIMEOUT_MS = 5 * 60 * 1000;
const DEFAULT_MAX_AGE_MS = 30 * 60 * 1000;
const DEFAULT_SWEEP_INTERVAL_MS = 30 * 1000;

const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "keep-alive",
  "transfer-encoding",
  "upgrade",
  // Faz 5: undici fetch gzip yanıtları OTO-DECOMPRESS eder — gövde akışta
  // ham bayt olur. content-encoding/content-length başlıkları taşınırsa
  // tarayıcı "ERR_CONTENT_DECODING_FAILED" ile kırılır (canlı üreme).
  "content-encoding",
  "content-length",
]);

interface StreamState {
  streamId: number;
  kind: "http" | "ws";
  seq: number;
  closed: boolean;
  credit: number;
  waiting: Array<() => void>;
  controller: AbortController;
  createdAt: number;
  lastActivityAt: number;
  request: StreamOpenMessage;
  upstreamWs?: ISocketClient;
  awaitingBody: boolean;
  bodyChunks: Buffer[];
  bodyBytes: number;
}

/**
 * TunnelClient — konteyner tarafı akış multiplexer'ı (tasarım §6 sorumluluk 3).
 *
 * - `stream-open` frame'lerini alır, stream'leri iki upstream'e dağıtır:
 *   `/api/*`, `/ws/*` → container web-service; diğer her şey → nginx (SPA).
 * - Undici fetch stream'lerini ≤64 KiB binary frame'lere böler; `stream-window`
 *   kredisiyle backpressure uygular (kredi yoksa gövde DURUR — §5.2).
 * - `upgrade:"websocket"` → loopback WS köprüsü; mesaj sınırları ve opcode'lar
 *   WS_OP bayrağıyla korunur (§5.3).
 * - Limitler: eşzamanlı akış tavanı → 503; boşta kalma/max yaş sweep'i
 *   (kırılganlık #2); `stream-close` (field) → iptal.
 */
export class TunnelClient {
  private readonly config: Required<
    Pick<
      TunnelClientConfig,
      | "webServiceUrl"
      | "staticUrl"
      | "windowSize"
      | "maxStreams"
      | "chunkSize"
      | "maxRequestBody"
      | "idleTimeoutMs"
      | "maxAgeMs"
      | "sweepIntervalMs"
    >
  >;
  private readonly codec = new FrameCodec();
  private readonly socketFactory: ISocketClientFactory;
  private readonly streams: Map<number, StreamState> = new Map();
  private sweepTimer?: ReturnType<typeof setInterval>;
  private channel?: ITunnelChannel;

  // ELEGANT-EXCEPTION: create() fabrikası — opsiyonel config alanlarına
  // varsayılanları uygular; birincil constructor yalnızca kurulum yapar.
  private constructor(config: TunnelClientConfig) {
    this.config = {
      webServiceUrl: config.webServiceUrl,
      staticUrl: config.staticUrl,
      windowSize: config.windowSize ?? DEFAULT_WINDOW_SIZE,
      maxStreams: config.maxStreams ?? DEFAULT_MAX_STREAMS,
      chunkSize: config.chunkSize ?? DEFAULT_CHUNK_SIZE,
      maxRequestBody: config.maxRequestBody ?? DEFAULT_MAX_REQUEST_BODY,
      idleTimeoutMs: config.idleTimeoutMs ?? DEFAULT_IDLE_TIMEOUT_MS,
      maxAgeMs: config.maxAgeMs ?? DEFAULT_MAX_AGE_MS,
      sweepIntervalMs: config.sweepIntervalMs ?? DEFAULT_SWEEP_INTERVAL_MS,
    };
    this.socketFactory = config.socketFactory ?? new WsSocketClientFactory();
  }

  static create(config: TunnelClientConfig): TunnelClient {
    return new TunnelClient(config);
  }

  /** FieldConnector kanalına abone olur (kontrol + binary). */
  attach(channel: ITunnelChannel): void {
    this.channel = channel;
    channel.onMessage((message) => this.handleControl(message));
    channel.onBinaryFrame((data) => this.handleBinaryFrame(data));
    this.sweepTimer = setInterval(() => this.sweep(), this.config.sweepIntervalMs);
  }

  /** Tüm akışları kapatır ve sweep'i durdurur (komut). */
  stop(): void {
    if (this.sweepTimer) clearInterval(this.sweepTimer);
    this.sweepTimer = undefined;
    for (const streamId of Array.from(this.streams.keys())) {
      this.closeStream(streamId, "stopped");
    }
  }

  private handleControl(message: unknown): void {
    const msg = message as { type?: string };
    switch (msg.type) {
      case "stream-open":
        this.onStreamOpen(message as StreamOpenMessage);
        return;
      case "stream-window": {
        const window = message as StreamWindowMessage;
        const state = this.streams.get(window.streamId);
        if (!state || state.closed) return;
        state.credit += window.credit;
        state.lastActivityAt = this.now();
        this.drainWaiting(state);
        return;
      }
      case "stream-close": {
        const close = message as StreamCloseMessage;
        this.closeStream(close.streamId, close.reason);
        return;
      }
      default:
        return;
    }
  }

  private onStreamOpen(msg: StreamOpenMessage): void {
    const active = Array.from(this.streams.values()).filter((s) => !s.closed);
    if (active.length >= this.config.maxStreams) {
      this.channel?.sendControl({
        type: "stream-open-ack",
        streamId: msg.streamId,
        statusCode: 503,
      } satisfies StreamOpenAckMessage);
      this.channel?.sendControl({
        type: "stream-close",
        streamId: msg.streamId,
        reason: "max-streams",
      } satisfies StreamCloseMessage);
      return;
    }

    const now = Date.now();
    const state: StreamState = {
      streamId: msg.streamId,
      kind: msg.upgrade === "websocket" ? "ws" : "http",
      seq: 0,
      closed: false,
      credit: 0,
      waiting: [],
      controller: new AbortController(),
      createdAt: now,
      lastActivityAt: now,
      request: msg,
      awaitingBody: needsBody(msg.method),
      bodyChunks: [],
      bodyBytes: 0,
    };
    this.streams.set(msg.streamId, state);

    if (state.kind === "ws") {
      this.openWsBridge(state);
    } else if (!state.awaitingBody) {
      void this.fetchStream(state, undefined);
    }
    // awaitingBody ise: body FIN gelince fetchStream tetiklenir (onBodyFrame)
  }

  private handleBinaryFrame(data: Buffer): void {
    const result = this.codec.decode(new Uint8Array(data));
    if (result.isErr()) return;
    const frame = result.unwrap();
    const state = this.streams.get(frame.streamId);
    if (!state || state.closed) return;
    state.lastActivityAt = Date.now();

    if ((frame.flags & FLAG_WS_OP) === FLAG_WS_OP) {
      this.onWsDataFrame(state, frame);
      return;
    }
    this.onBodyFrame(state, frame);
  }

  private onWsDataFrame(state: StreamState, frame: TunnelFrame): void {
    const socket = state.upstreamWs;
    if (!socket || socket.readyState() !== "open") return;
    if (frame.opcode === WS_OPCODE.Binary) {
      socket.sendBinary(frame.payload);
    } else {
      socket.send(Buffer.from(frame.payload).toString("utf8"));
    }
  }

  private onBodyFrame(state: StreamState, frame: TunnelFrame): void {
    if (!state.awaitingBody) return;
    state.bodyBytes += frame.payload.length;
    if (state.bodyBytes > this.config.maxRequestBody) {
      this.sendRst(state);
      this.closeStream(state.streamId, "request-body-too-large");
      return;
    }
    state.bodyChunks.push(Buffer.from(frame.payload));
    if ((frame.flags & FLAG_FIN) === FLAG_FIN) {
      state.awaitingBody = false;
      void this.fetchStream(state, Buffer.concat(state.bodyChunks));
    }
  }

  /** HTTP akışı: loopback fetch → ack → kredi kontrollü gövde frame'leri. */
  private async fetchStream(
    state: StreamState,
    body: Buffer | undefined,
  ): Promise<void> {
    const target = upstreamUrl(
      state.request.path,
      this.config.webServiceUrl,
      this.config.staticUrl,
    );
    let response: Response;
    try {
      response = await fetch(`${target}${state.request.path}`, {
        method: state.request.method,
        headers: state.request.headers,
        body,
        signal: state.controller.signal,
      });
    } catch (error) {
      if (!state.closed) {
        this.channel?.sendControl({
          type: "stream-open-ack",
          streamId: state.streamId,
          statusCode: 502,
        } satisfies StreamOpenAckMessage);
        this.closeStream(state.streamId, "fetch-error");
      }
      void error;
      return;
    }

    if (state.closed) return;
    this.channel?.sendControl({
      type: "stream-open-ack",
      streamId: state.streamId,
      statusCode: response.status,
      headers: filterHeaders(response.headers),
    } satisfies StreamOpenAckMessage);

    const reader = response.body?.getReader();
    if (!reader) {
      this.sendFin(state);
      return;
    }

    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        if (state.closed) return;
        const sent = await this.sendPayload(state, value);
        if (!sent) return;
      }
      this.sendFin(state);
      // FIN sonrası akış KAPATILIR — aksi halde stream state'i birikir ve
      // 16 akış tavanına ulaşınca tüm yeni akışlar 503 alır (canlı üreme
      // 2026-08-25: 22× max-streams). closeStream ayrıca field'a idempotent
      // stream-close gönderir (field FIN'de kendi state'ini zaten temizler).
      this.closeStream(state.streamId, "done");
    } catch {
      if (!state.closed) {
        this.closeStream(state.streamId, "fetch-error");
      }
    }
  }

  /** Gövde parçasını kredi kontrollü gönderir — kredi yoksa bekler. */
  private async sendPayload(state: StreamState, chunk: Uint8Array): Promise<boolean> {
    for (let offset = 0; offset < chunk.length; ) {
      const piece = chunk.subarray(offset, Math.min(offset + this.config.chunkSize, chunk.length));
      offset += piece.length;
      if (state.closed) return false;
      try {
        await this.awaitCredit(state, piece.length);
      } catch {
        return false;
      }
      if (state.closed) return false;
      state.credit -= piece.length;
      state.lastActivityAt = Date.now();
      this.channel?.sendBinary(
        this.codec.encode({
          streamId: state.streamId,
          seq: state.seq++,
          flags: 0,
          payload: piece,
        }),
      );
    }
    return true;
  }

  private sendFin(state: StreamState): void {
    if (state.closed) return;
    this.channel?.sendBinary(
      this.codec.encode({
        streamId: state.streamId,
        seq: state.seq++,
        flags: FLAG_FIN,
        payload: new Uint8Array(0),
      }),
    );
  }

  private openWsBridge(state: StreamState): void {
    const base = upstreamUrl(
      state.request.path,
      this.config.webServiceUrl,
      this.config.staticUrl,
    );
    const wsUrl = base.replace(/^http/, "ws") + state.request.path;
    const socket = this.socketFactory.create(wsUrl, {});
    state.upstreamWs = socket;

    socket.onOpen(() => {
      if (state.closed) return;
      this.channel?.sendControl({
        type: "stream-open-ack",
        streamId: state.streamId,
        statusCode: 101,
      } satisfies StreamOpenAckMessage);
    });
    socket.onMessage((text) => {
      if (state.closed) return;
      state.lastActivityAt = Date.now();
      this.channel?.sendBinary(
        this.codec.encode({
          streamId: state.streamId,
          seq: state.seq++,
          flags: FLAG_WS_OP,
          opcode: WS_OPCODE.Text,
          payload: new TextEncoder().encode(text),
        }),
      );
    });
    socket.onBinaryMessage((data) => {
      if (state.closed) return;
      state.lastActivityAt = Date.now();
      this.channel?.sendBinary(
        this.codec.encode({
          streamId: state.streamId,
          seq: state.seq++,
          flags: FLAG_WS_OP,
          opcode: WS_OPCODE.Binary,
          payload: new Uint8Array(data),
        }),
      );
    });
    socket.onClose(() => {
      if (!state.closed) this.closeStream(state.streamId, "ws-closed");
    });
    socket.onError(() => {
      if (!state.closed) this.closeStream(state.streamId, "ws-error");
    });
  }

  private async awaitCredit(state: StreamState, needed: number): Promise<void> {
    while (state.credit < needed && !state.closed) {
      await new Promise<void>((resolve) => {
        state.waiting.push(resolve);
      });
    }
    if (state.closed) throw new Error("stream-closed");
  }

  private drainWaiting(state: StreamState): void {
    const waiters = state.waiting.splice(0, state.waiting.length);
    waiters.forEach((resolve) => resolve());
  }

  private sendRst(state: StreamState): void {
    this.channel?.sendBinary(
      this.codec.encode({
        streamId: state.streamId,
        seq: state.seq++,
        flags: FLAG_RST,
        payload: new Uint8Array(0),
      }),
    );
  }

  private closeStream(streamId: number, reason: string): void {
    const state = this.streams.get(streamId);
    if (!state || state.closed) return;
    state.closed = true;
    state.controller.abort();
    state.upstreamWs?.close();
    this.drainWaiting(state);
    this.streams.delete(streamId);
    this.channel?.sendControl({
      type: "stream-close",
      streamId,
      reason,
    } satisfies StreamCloseMessage);
  }

  private sweep(): void {
    const now = Date.now();
    for (const state of Array.from(this.streams.values())) {
      if (state.closed) continue;
      if (now - state.lastActivityAt >= this.config.idleTimeoutMs) {
        this.closeStream(state.streamId, "idle-timeout");
      } else if (now - state.createdAt >= this.config.maxAgeMs) {
        this.closeStream(state.streamId, "max-age");
      }
    }
  }

  private now(): number {
    return Date.now();
  }
}

function needsBody(method: string): boolean {
  return method === "POST" || method === "PUT" || method === "PATCH";
}

/** Yönlendirme kuralı (tasarım §6/3): /api|/ws → web-service, diğer → nginx. */
export function upstreamUrl(path: string, webServiceUrl: string, staticUrl: string): string {
  return path.startsWith("/api/") || path.startsWith("/ws/")
    ? webServiceUrl
    : staticUrl;
}

/** Yanıt başlıklarını hop-by-hop başlıklardan arındırır. */
export function filterHeaders(headers: Headers): Record<string, string> {
  const out: Record<string, string> = {};
  headers.forEach((value, key) => {
    if (HOP_BY_HOP_HEADERS.has(key.toLowerCase())) return;
    out[key] = value;
  });
  return out;
}
