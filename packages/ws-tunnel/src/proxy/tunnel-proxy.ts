import {
  FrameCodec,
  FLAG_FIN,
  FLAG_RST,
  FLAG_WS_OP,
  WS_OPCODE,
  MAX_CHUNK_SIZE,
} from "../codec";
import type { TunnelFrame } from "../codec";
import type { StreamOpenMessage, StreamOpenAckMessage, StreamWindowMessage, StreamCloseMessage } from "../protocol";

import type { ILogger } from "../logger";
import type { IFieldChannel } from "../channel";

import { FieldSessionStore } from "./field-session-store";
import type { FieldSession } from "./field-session-store";
import type { IStreamSink } from "./stream-sink";

/** TunnelProxy yapılandırması — opsiyonel alanlar testlerde enjekte edilir. */
export interface TunnelProxyConfig {
  /** Akış kredisi pencere boyutu (tasarım §5.2: 256 KiB). */
  windowSize?: number;
  /** Eşzamanlı akış tavanı (tasarım §5.6: 16). */
  maxStreams?: number;
  /** stream-open-ack bekleme süresi (ms). */
  streamTimeoutMs?: number;
  /** Akış boşta kalma süresi (ms). */
  idleTimeoutMs?: number;
  /** Akış azami yaşı (ms). */
  maxAgeMs?: number;
  /** Sweep aralığı (ms). */
  sweepIntervalMs?: number;
  /** Zaman kaynağı — testlerde deterministik. */
  now?: () => number;
}

const DEFAULT_WINDOW_SIZE = 256 * 1024;
const DEFAULT_MAX_STREAMS = 16;
const DEFAULT_STREAM_TIMEOUT_MS = 10 * 1000;
const DEFAULT_IDLE_TIMEOUT_MS = 5 * 60 * 1000;
const DEFAULT_MAX_AGE_MS = 30 * 60 * 1000;
const DEFAULT_SWEEP_INTERVAL_MS = 30 * 1000;

const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "keep-alive",
  "transfer-encoding",
  "upgrade",
  "host",
  "content-length",
]);

interface HttpStreamState {
  streamId: number;
  session: FieldSession;
  raw: IStreamSink;
  seq: number;
  bytesOut: number;
  lastGranted: number;
  finished: boolean;
  createdAt: number;
  lastActivityAt: number;
}

interface WsStreamState {
  streamId: number;
  session: FieldSession;
  browserSocket: { send(data: Buffer | string, options?: { binary?: boolean }): void; close(code?: number): void };
  seq: number;
  createdAt: number;
  lastActivityAt: number;
}

/** Cookie başlığından `container_session` değerini çözer (sorgu — saf). */
export function containerSessionCookie(cookieHeader: string | undefined): string | undefined {
  if (!cookieHeader) return undefined;
  for (const part of cookieHeader.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    const name = part.slice(0, eq).trim();
    if (name === "container_session") return part.slice(eq + 1).trim();
  }
  return undefined;
}

/** Path allowlist — tasarım §5.6 (yasaklılar login/refresh/users). */
export function isPathAllowed(path: string): boolean {
  const clean = path.split("?")[0] ?? path;
  if (
    clean === "/" ||
    clean.startsWith("/api/") ||
    clean.startsWith("/ws/") ||
    clean.startsWith("/assets/") ||
    clean.startsWith("/favicon")
  ) {
    if (
      clean.startsWith("/api/auth/login") ||
      clean.startsWith("/api/auth/refresh") ||
      clean.startsWith("/api/auth/users")
    ) {
      return false;
    }
    return true;
  }
  return false;
}

/**
 * TunnelProxy — field tarafı `/containers/:cid/ui/*` HTTP/WS proxy'si
 * (tasarım §5.2/§5.3, T3.3). Tarayıcı isteğini stream-open frame'lerine
 * çevirir; binary frame'leri yanıt akışına borular; `stream-window` kredisiyle
 * konteynere akış izni verir; WS upgrade → çift yönlü WS_OP köprüsü.
 */
export class TunnelProxy {
  private readonly config: Required<
    Pick<
      TunnelProxyConfig,
      "windowSize" | "maxStreams" | "streamTimeoutMs" | "idleTimeoutMs" | "maxAgeMs" | "sweepIntervalMs"
    >
  >;
  private readonly codec = new FrameCodec();
  private readonly now: () => number;
  private nextStreamId = 1;
  private pendingAcks: Map<number, (ack: StreamOpenAckMessage) => void> = new Map();
  private httpStreams: Map<number, HttpStreamState> = new Map();
  private wsStreams: Map<number, WsStreamState> = new Map();
  private sweepTimer?: ReturnType<typeof setInterval>;
  private unsubscribeControl?: () => void;
  private unsubscribeBinary?: () => void;

  // ELEGANT-EXCEPTION: opsiyonel config alanları — üretim varsayılanlarla
  // çalışır, testler enjekte eder (AlertNotifier deseni).
  constructor(
    private readonly channel: IFieldChannel,
    private readonly sessions: FieldSessionStore,
    private readonly logger: ILogger | undefined,
    config: TunnelProxyConfig = {},
  ) {
    this.config = {
      windowSize: config.windowSize ?? DEFAULT_WINDOW_SIZE,
      maxStreams: config.maxStreams ?? DEFAULT_MAX_STREAMS,
      streamTimeoutMs: config.streamTimeoutMs ?? DEFAULT_STREAM_TIMEOUT_MS,
      idleTimeoutMs: config.idleTimeoutMs ?? DEFAULT_IDLE_TIMEOUT_MS,
      maxAgeMs: config.maxAgeMs ?? DEFAULT_MAX_AGE_MS,
      sweepIntervalMs: config.sweepIntervalMs ?? DEFAULT_SWEEP_INTERVAL_MS,
    };
    this.now = config.now ?? (() => Date.now());
  }

  /** Observer + sweep kurulumu (komut). */
  initialize(): void {
    this.unsubscribeControl = this.channel.onControlMessage((_containerId, message) =>
      this.onControlMessage(message),
    );
    this.unsubscribeBinary = this.channel.onBinaryFrame((containerId, data) =>
      this.onBinaryFrame(containerId, data),
    );
    this.sweepTimer = setInterval(() => this.sweep(), this.config.sweepIntervalMs);
  }

  /** Observer + sweep kapatma (komut). */
  stop(): void {
    if (this.sweepTimer) clearInterval(this.sweepTimer);
    this.sweepTimer = undefined;
    this.unsubscribeControl?.();
    this.unsubscribeControl = undefined;
    this.unsubscribeBinary?.();
    this.unsubscribeBinary = undefined;
    for (const state of this.httpStreams.values()) this.cleanupHttp(state, "stopped");
    for (const state of this.wsStreams.values()) this.cleanupWs(state, "stopped");
  }

  /** Cookie → oturum doğrulama (sorgu) — containerId eşleşmesi dahil. */
  authenticate(cookieHeader: string | undefined, containerId: string): FieldSession | undefined {
    const token = containerSessionCookie(cookieHeader);
    if (!token) return undefined;
    const session = this.sessions.byToken(token);
    if (!session || session.containerId !== containerId) return undefined;
    return session;
  }

  /** HTTP akışını başlatır (komut) — Fastify handler'ından çağrılır. */
  async startHttpStream(input: {
    session: FieldSession;
    method: string;
    path: string;
    headers: Record<string, string>;
    raw: IStreamSink;
    requestBody?: Buffer;
  }): Promise<void> {
    const streamId = this.assignStreamId();
    // Sıra: stream-open → BODY frame'leri → ack. Konteyner fetch'i ancak body
    // FIN'den sonra başlatır ve ack'i yanıt başlarken üretir — gövde ack'ten
    // önce gitmelidir, yoksa karşılıklı bekleme deadlock'u (canlı üreme).
    const ackPromise = this.sendStreamOpen(streamId, input.session, {
      method: input.method,
      path: input.path,
      headers: input.headers,
    });
    if (!ackPromise) return;
    if (input.requestBody && input.requestBody.length > 0) {
      this.sendBodyFrames(streamId, input.requestBody, input.session.containerId);
    }
    const ack = await this.raceAck(streamId, ackPromise);
    if (!ack) return;

    const state: HttpStreamState = {
      streamId,
      session: input.session,
      raw: input.raw,
      seq: 0,
      bytesOut: 0,
      lastGranted: 0,
      finished: false,
      createdAt: this.now(),
      lastActivityAt: this.now(),
    };

    input.raw.status(ack.statusCode, ack.headers ?? {});
    input.raw.onClose(() => {
      if (!state.finished) {
        this.closeStream(streamId, "client-abort");
        this.cleanupHttp(state, "client-abort");
      }
    });

    this.httpStreams.set(streamId, state);

    this.grantCredit(streamId, this.config.windowSize);
  }

  /** WS köprüsünü başlatır (komut) — açılırsa streamId döner. */
  async startWsBridge(input: {
    session: FieldSession;
    path: string;
    browserSocket: WsStreamState["browserSocket"];
  }): Promise<number | undefined> {
    const streamId = this.assignStreamId();
    const ackPromise = this.sendStreamOpen(streamId, input.session, {
      method: "GET",
      path: input.path,
      upgrade: "websocket",
    });
    if (!ackPromise) return undefined;
    const ack = await this.raceAck(streamId, ackPromise);
    if (!ack || ack.statusCode !== 101) {
      input.browserSocket.close(1013);
      return undefined;
    }
    const state: WsStreamState = {
      streamId,
      session: input.session,
      browserSocket: input.browserSocket,
      seq: 0,
      createdAt: this.now(),
      lastActivityAt: this.now(),
    };
    this.wsStreams.set(streamId, state);
    return streamId;
  }

  /** Tarayıcı WS'ini kapatır (komut) — `stream-close` + temizlik. */
  closeWs(streamId: number, reason: string): void {
    const state = this.wsStreams.get(streamId);
    if (!state) return;
    this.closeStream(streamId, reason);
    this.cleanupWs(state, reason);
  }

  /** Tarayıcı WS mesajını konteynere iletir (komut). */
  sendWsToContainer(streamId: number, data: Buffer, isBinary: boolean): void {
    const state = this.wsStreams.get(streamId);
    if (!state) return;
    state.lastActivityAt = this.now();
    this.channel.sendBinary(
      state.session.containerId,
      this.codec.encode({
        streamId,
        seq: state.seq++,
        flags: FLAG_WS_OP,
        opcode: isBinary ? WS_OPCODE.Binary : WS_OPCODE.Text,
        payload: new Uint8Array(data),
      }),
    );
  }

  /** stream-open gönderir ve ack vaadini döner — gövde ack'ten önce akabilir. */
  private sendStreamOpen(
    streamId: number,
    session: FieldSession,
    request: Omit<StreamOpenMessage, "type" | "streamId" | "sessionId">,
  ): Promise<StreamOpenAckMessage> | undefined {
    const total = this.httpStreams.size + this.wsStreams.size;
    if (total >= this.config.maxStreams) return undefined;

    const ackPromise = new Promise<StreamOpenAckMessage>((resolve) => {
      this.pendingAcks.set(streamId, resolve);
    });
    this.channel.sendControl(session.containerId, {
      type: "stream-open",
      streamId,
      sessionId: session.sessionId,
      ...request,
    } satisfies StreamOpenMessage);
    return ackPromise;
  }

  /** Ack'i zaman aşımıyla bekler — yoksa kaydı temizler, undefined döner. */
  private async raceAck(
    streamId: number,
    ackPromise: Promise<StreamOpenAckMessage>,
  ): Promise<StreamOpenAckMessage | undefined> {
    const ack = await Promise.race([
      ackPromise,
      new Promise<undefined>((resolve) =>
        setTimeout(() => resolve(undefined), this.config.streamTimeoutMs),
      ),
    ]);
    if (ack === undefined) {
      this.pendingAcks.delete(streamId);
      return undefined;
    }
    return ack;
  }

  private onControlMessage(message: unknown): void {
    const msg = message as { type?: string };
    if (msg.type === "stream-open-ack") {
      const ack = message as StreamOpenAckMessage;
      const resolve = this.pendingAcks.get(ack.streamId);
      if (resolve) {
        this.pendingAcks.delete(ack.streamId);
        resolve(ack);
      }
    } else if (msg.type === "stream-close") {
      const close = message as StreamCloseMessage;
      const http = this.httpStreams.get(close.streamId);
      if (http) this.cleanupHttp(http, close.reason);
      const ws = this.wsStreams.get(close.streamId);
      if (ws) this.cleanupWs(ws, close.reason);
    }
  }

  private onBinaryFrame(containerId: string, data: Buffer): void {
    const result = this.codec.decode(new Uint8Array(data));
    if (result.isErr()) return;
    const frame = result.unwrap();

    const http = this.httpStreams.get(frame.streamId);
    if (http) {
      this.onHttpFrame(http, frame);
      return;
    }
    const ws = this.wsStreams.get(frame.streamId);
    if (ws) {
      this.onWsFrame(ws, frame);
    }
    void containerId;
  }

  private onHttpFrame(state: HttpStreamState, frame: TunnelFrame): void {
    state.lastActivityAt = this.now();
    if ((frame.flags & FLAG_RST) === FLAG_RST) {
      state.raw.destroy();
      this.cleanupHttp(state, "rst");
      return;
    }
    if (frame.payload.length > 0) {
      state.raw.write(Buffer.from(frame.payload));
      state.bytesOut += frame.payload.length;
      state.session.bytesOut += frame.payload.length;
      // Kredi YARI pencere eşiğinde yenilenir — tam pencere eşiği deadlock
      // üretir (kırılganlık #2): istemcinin gönderdiği toplam bayt pencereyle
      // hizalanmazsa (örn. 249856 < 262144) istemci kredi bekler, alan da
      // eşiğe ulaşamadığı için kredi vermez. Yarı eşikte istemcinin kalan
      // kredisi asla parça boyutunun altına inmez (standart akış kontrolü).
      if (state.bytesOut - state.lastGranted >= this.config.windowSize / 2) {
        state.lastGranted = state.bytesOut;
        this.grantCredit(state.streamId, this.config.windowSize);
      }
    }
    if ((frame.flags & FLAG_FIN) === FLAG_FIN) {
      state.finished = true;
      state.raw.end();
      this.cleanupHttp(state, "done");
    }
  }

  private onWsFrame(state: WsStreamState, frame: TunnelFrame): void {
    state.lastActivityAt = this.now();
    if ((frame.flags & FLAG_RST) === FLAG_RST) {
      state.browserSocket.close(1011);
      this.cleanupWs(state, "rst");
      return;
    }
    if ((frame.flags & FLAG_WS_OP) === FLAG_WS_OP) {
      const binary = frame.opcode === WS_OPCODE.Binary;
      state.browserSocket.send(Buffer.from(frame.payload), { binary });
      state.session.bytesIn += frame.payload.length;
    }
  }

  private sendBodyFrames(
    streamId: number,
    body: Buffer,
    containerId: string,
  ): void {
    for (let offset = 0; offset < body.length; offset += MAX_CHUNK_SIZE) {
      const chunk = body.subarray(offset, Math.min(offset + MAX_CHUNK_SIZE, body.length));
      const isLast = offset + chunk.length >= body.length;
      this.channel.sendBinary(
        containerId,
        this.codec.encode({
          streamId,
          seq: 0,
          flags: isLast ? FLAG_FIN : 0,
          payload: new Uint8Array(chunk),
        }),
      );
    }
  }

  private grantCredit(streamId: number, credit: number): void {
    const session = this.httpStreams.get(streamId)?.session;
    if (!session) return;
    this.channel.sendControl(session.containerId, {
      type: "stream-window",
      streamId,
      credit,
    } satisfies StreamWindowMessage);
  }

  private closeStream(streamId: number, reason: string): void {
    const session =
      this.httpStreams.get(streamId)?.session ??
      this.wsStreams.get(streamId)?.session;
    if (!session) return;
    this.channel.sendControl(session.containerId, {
      type: "stream-close",
      streamId,
      reason,
    } satisfies StreamCloseMessage);
  }

  private cleanupHttp(state: HttpStreamState, reason: string): void {
    if (this.httpStreams.get(state.streamId) !== state) return;
    this.httpStreams.delete(state.streamId);
    if (!state.finished) state.raw.destroy();
    if (reason !== "done" && reason !== "stopped") {
      this.logStreamClose(state.streamId, reason);
    }
  }

  private cleanupWs(state: WsStreamState, reason: string): void {
    if (this.wsStreams.get(state.streamId) !== state) return;
    this.wsStreams.delete(state.streamId);
    state.browserSocket.close(1000);
    if (reason !== "stopped") {
      this.logStreamClose(state.streamId, reason);
    }
  }

  private logStreamClose(streamId: number, reason: string): void {
    this.logger?.log({
      level: "info",
      category: "security",
      eventCode: "session_end",
      message: "Tunel akisi kapandi",
      context: { streamId, reason },
    }).catch(() => {});
  }

  private assignStreamId(): number {
    const id = this.nextStreamId;
    this.nextStreamId += 1;
    return id;
  }

  private sweep(): void {
    const now = this.now();
    for (const state of Array.from(this.httpStreams.values())) {
      if (now - state.lastActivityAt >= this.config.idleTimeoutMs || now - state.createdAt >= this.config.maxAgeMs) {
        state.raw.destroy();
        this.closeStream(state.streamId, "idle-timeout");
        this.cleanupHttp(state, "idle-timeout");
      }
    }
    for (const state of Array.from(this.wsStreams.values())) {
      if (now - state.lastActivityAt >= this.config.idleTimeoutMs || now - state.createdAt >= this.config.maxAgeMs) {
        state.browserSocket.close(1011);
        this.closeStream(state.streamId, "idle-timeout");
        this.cleanupWs(state, "idle-timeout");
      }
    }
  }
}
