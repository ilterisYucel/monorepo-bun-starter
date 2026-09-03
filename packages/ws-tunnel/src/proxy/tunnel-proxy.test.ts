import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  TunnelProxy,
  containerSessionCookie,
  isPathAllowed,
} from "./tunnel-proxy";
import { FieldSessionStore } from "./field-session-store";
import { FrameCodec, FLAG_FIN, FLAG_RST, FLAG_WS_OP, WS_OPCODE } from "../codec";
import type { IFieldChannel } from "../channel";
import type { ILogger } from "../logger";
import type { IStreamSink } from "./stream-sink";
import type { FieldSession } from "./field-session-store";
import type { TunnelUser } from "../types";

/**
 * T3.3 — TunnelProxy sözleşmesi (tasarım §5.2/§5.3/§5.6):
 * - Cookie çözümleme (`container_session`) + path allowlist (yasaklılar:
 *   login/refresh/users).
 * - HTTP akışı: stream-open → ack → writeHead(ack.status, headers) → gövde
 *   frame'leri → FIN → end(); RST → destroy; kredi: pencere tüketimi → 
 *   stream-window; tarayıcı kopması → stream-close.
 * - WS köprüsü: 101 ack → açık; WS_OP frame'leri çift yönlü; stream-close →
 *   kapanma; tarayıcı kapanması → closeWs → stream-close.
 */

const user: TunnelUser = {
  id: "u-1",
  username: "op",
  role: "teknik",
};

function makeSession(): FieldSession {
  return {
    sessionId: "s-1",
    containerId: "c-1",
    token: "container-jwt",
    user,
    containerRole: "admin",
    createdAt: 0,
    lastActivityAt: 0,
    bytesIn: 0,
    bytesOut: 0,
  };
}

function makeFakeChannel() {
  const controlSubscribers = new Set<(c: string, m: unknown) => void>();
  const binarySubscribers = new Set<(c: string, d: Buffer) => void>();
  const sentControls: unknown[] = [];
  const sentBinary: Buffer[] = [];
  const channel = {
    sendControl: (_cid: string, message: unknown) => {
      sentControls.push(message);
    },
    sendBinary: (_cid: string, data: Buffer) => {
      sentBinary.push(data);
    },
    isConnected: () => true,
    onControlMessage: (cb: (c: string, m: unknown) => void) => {
      controlSubscribers.add(cb);
      return () => controlSubscribers.delete(cb);
    },
    onBinaryFrame: (cb: (c: string, d: Buffer) => void) => {
      binarySubscribers.add(cb);
      return () => binarySubscribers.delete(cb);
    },
  } as IFieldChannel;
  return {
    channel,
    sentControls,
    sentBinary,
    emitControl: (m: unknown) =>
      controlSubscribers.forEach((cb) => cb("c-1", m)),
    emitBinary: (d: Buffer) =>
      binarySubscribers.forEach((cb) => cb("c-1", d)),
  };
}

function makeFakeSink() {
  const chunks: Buffer[] = [];
  const closeCallbacks: Array<() => void> = [];
  const raw = {
    status: vi.fn(),
    write: vi.fn((chunk: Buffer) => {
      chunks.push(Buffer.from(chunk));
    }),
    end: vi.fn(),
    destroy: vi.fn(),
    onClose: vi.fn((cb: () => void) => {
      closeCallbacks.push(cb);
    }),
  } as unknown as IStreamSink;
  return { raw, chunks, closeCallbacks };
}

const codec = new FrameCodec();
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe("containerSessionCookie", () => {
  it("cookie başlığından değeri çözer", () => {
    expect(
      containerSessionCookie("a=1; container_session=xyz; b=2"),
    ).toBe("xyz");
  });
  it("yoksa undefined", () => {
    expect(containerSessionCookie("a=1; b=2")).toBeUndefined();
    expect(containerSessionCookie(undefined)).toBeUndefined();
  });
  it("bozuk parçalar atlanır", () => {
    expect(containerSessionCookie("bare; container_session=abc")).toBe("abc");
    expect(containerSessionCookie("bare")).toBeUndefined();
  });
});

describe("isPathAllowed (§5.6)", () => {
  it.each(["/", "/api/data/x", "/ws/telemetry", "/assets/app.js", "/favicon.ico"])(
    "izinli: %s",
    (path) => expect(isPathAllowed(path)).toBe(true),
  );
  it.each([
    "/api/auth/login",
    "/api/auth/refresh",
    "/api/auth/users",
    "/etc/passwd",
    "/api/auth/users?x=1",
  ])("yasaklı: %s", (path) => expect(isPathAllowed(path)).toBe(false));
});

describe("TunnelProxy HTTP akışı (T3.3)", () => {
  let fake: ReturnType<typeof makeFakeChannel>;
  let store: FieldSessionStore;
  let proxy: TunnelProxy;

  beforeEach(() => {
    fake = makeFakeChannel();
    store = new FieldSessionStore();
    store.register(makeSession());
    proxy = new TunnelProxy(fake.channel, store, undefined);
    proxy.initialize();
  });

  afterEach(() => {
    proxy.stop();
  });

  it("ack → writeHead + gövde frame'leri + FIN → end", async () => {
    const { raw, chunks } = makeFakeSink();
    const start = proxy.startHttpStream({
      session: makeSession(),
      method: "GET",
      path: "/api/data/latest",
      headers: { accept: "application/json" },
      raw,
    });
    await wait(10);
    expect(fake.sentControls[0]).toMatchObject({
      type: "stream-open",
      method: "GET",
      path: "/api/data/latest",
    });
    fake.emitControl({
      type: "stream-open-ack",
      streamId: 1,
      statusCode: 200,
      headers: { "content-type": "text/html" },
    });
    await start;
    expect(raw.status).toHaveBeenCalledWith(200, { "content-type": "text/html" });
    // kredi: windowSize kadar başlangıç kredisi gönderildi
    expect(
      fake.sentControls.some((m) => (m as { type: string }).type === "stream-window"),
    ).toBe(true);

    fake.emitBinary(codec.encode({ streamId: 1, seq: 0, flags: 0, payload: new TextEncoder().encode("he") }));
    fake.emitBinary(codec.encode({ streamId: 1, seq: 1, flags: FLAG_FIN, payload: new TextEncoder().encode("llo") }));
    expect(Buffer.concat(chunks).toString()).toBe("hello");
    expect(raw.end).toHaveBeenCalled();
  });

  it("RST → destroy", async () => {
    const { raw } = makeFakeSink();
    const start = proxy.startHttpStream({
      session: makeSession(),
      method: "GET",
      path: "/",
      headers: {},
      raw,
    });
    await wait(10);
    fake.emitControl({ type: "stream-open-ack", streamId: 1, statusCode: 200 });
    await start;
    fake.emitBinary(codec.encode({ streamId: 1, seq: 0, flags: FLAG_RST, payload: new Uint8Array(0) }));
    expect(raw.destroy).toHaveBeenCalled();
  });

  it("ack gelmezse (timeout) hiçbir şey yazılmaz", async () => {
    vi.useFakeTimers();
    const { raw } = makeFakeSink();
    const start = proxy.startHttpStream({
      session: makeSession(),
      method: "GET",
      path: "/",
      headers: {},
      raw,
    });
    vi.advanceTimersByTime(10_000);
    await start;
    expect(raw.status).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("tarayıcı kopması → stream-close", async () => {
    const { raw, closeCallbacks: listeners } = makeFakeSink();
    const start = proxy.startHttpStream({
      session: makeSession(),
      method: "GET",
      path: "/",
      headers: {},
      raw,
    });
    await wait(10);
    fake.emitControl({ type: "stream-open-ack", streamId: 1, statusCode: 200 });
    await start;
    listeners[0]?.();
    expect(
      fake.sentControls.some(
        (m) =>
          (m as { type: string; reason: string }).type === "stream-close" &&
          (m as { reason: string }).reason === "client-abort",
      ),
    ).toBe(true);
  });

  it("kredi: YARI pencere eşiğinde yeni stream-window gönderilir", async () => {
    const small = new TunnelProxy(fake.channel, store, undefined, {
      windowSize: 10,
    });
    small.initialize();
    const { raw } = makeFakeSink();
    const start = small.startHttpStream({
      session: makeSession(),
      method: "GET",
      path: "/",
      headers: {},
      raw,
    });
    await wait(10);
    const streamId = (fake.sentControls[0] as { streamId: number }).streamId;
    fake.emitControl({ type: "stream-open-ack", streamId, statusCode: 200 });
    await start;
    // 6 + 6 + 1 bayt — yarı eşik (5) iki kez aşılır (0→6→12) + başlangıç kredisi
    fake.emitBinary(codec.encode({ streamId, seq: 0, flags: 0, payload: new Uint8Array(6) }));
    fake.emitBinary(codec.encode({ streamId, seq: 1, flags: 0, payload: new Uint8Array(6) }));
    fake.emitBinary(codec.encode({ streamId, seq: 2, flags: FLAG_FIN, payload: new Uint8Array(1) }));
    const credits = fake.sentControls.filter(
      (m) => (m as { type: string }).type === "stream-window",
    );
    expect(credits.length).toBeGreaterThanOrEqual(3);
    small.stop();
  });

  it("kredi DEADLOCK KORUMASI: pencere altı tüketimde bile kredi yenilenir", async () => {
    // Kırılganlık #2 canlı üremesi: istemci toplamı pencereyle hizalanmayan
    // bayt gönderir (örn. 9 bayt < pencere 10) ve bekler — alan YARI eşikte
    // (≥5) kredi vermelidir, yoksa akış kilitlenir.
    const small = new TunnelProxy(fake.channel, store, undefined, {
      windowSize: 10,
    });
    small.initialize();
    const { raw } = makeFakeSink();
    const start = small.startHttpStream({
      session: makeSession(),
      method: "GET",
      path: "/",
      headers: {},
      raw,
    });
    await wait(10);
    const streamId = (fake.sentControls[0] as { streamId: number }).streamId;
    fake.emitControl({ type: "stream-open-ack", streamId, statusCode: 200 });
    await start;
    fake.emitBinary(codec.encode({ streamId, seq: 0, flags: 0, payload: new Uint8Array(9) }));
    const credits = fake.sentControls.filter(
      (m) => (m as { type: string }).type === "stream-window",
    );
    // başlangıç + yarı eşik (9 ≥ 5) → en az 2 kredi
    expect(credits.length).toBeGreaterThanOrEqual(2);
    small.stop();
  });

  it("authenticate: geçersiz cookie → undefined", () => {
    expect(proxy.authenticate("container_session=yok", "c-1")).toBeUndefined();
    expect(proxy.authenticate(undefined, "c-1")).toBeUndefined();
    expect(proxy.authenticate("container_session=container-jwt", "c-1")).toBeDefined();
    expect(proxy.authenticate("container_session=container-jwt", "c-2")).toBeUndefined();
  });

  it("requestBody → BINARY frame'ler + FIN gönderilir", async () => {
    const { raw } = makeFakeSink();
    const start = proxy.startHttpStream({
      session: makeSession(),
      method: "POST",
      path: "/api/commands/execute",
      headers: {},
      raw,
      requestBody: Buffer.from("body-content"),
    });
    await wait(10);
    const streamId = (fake.sentControls[0] as { streamId: number }).streamId;
    fake.emitControl({ type: "stream-open-ack", streamId, statusCode: 200 });
    await start;
    expect(fake.sentBinary.length).toBeGreaterThan(0);
    const frame = codec.decode(new Uint8Array(fake.sentBinary[0])).unwrap();
    expect(frame.flags & FLAG_FIN).toBe(FLAG_FIN);
    expect(Buffer.from(frame.payload).toString()).toBe("body-content");
  });

  it("konteyner stream-close (http) → yanıt destroy edilir", async () => {
    const { raw } = makeFakeSink();
    const start = proxy.startHttpStream({
      session: makeSession(),
      method: "GET",
      path: "/",
      headers: {},
      raw,
    });
    await wait(10);
    const streamId = (fake.sentControls[0] as { streamId: number }).streamId;
    fake.emitControl({ type: "stream-open-ack", streamId, statusCode: 200 });
    await start;
    fake.emitControl({ type: "stream-close", streamId, reason: "fetch-error" });
    expect(raw.destroy).toHaveBeenCalled();
  });

  it("malform binary frame yok sayılır", async () => {
    const { raw } = makeFakeSink();
    const start = proxy.startHttpStream({
      session: makeSession(),
      method: "GET",
      path: "/",
      headers: {},
      raw,
    });
    await wait(10);
    fake.emitControl({ type: "stream-open-ack", streamId: 1, statusCode: 200 });
    await start;
    expect(() => fake.emitBinary(Buffer.from([1, 2]))).not.toThrow();
  });

  it("akış tavanı dolunca stream açılmaz (writeHead yok)", async () => {
    const capped = new TunnelProxy(fake.channel, store, undefined, {
      maxStreams: 1,
    });
    capped.initialize();
    const first = makeFakeSink();
    const one = capped.startHttpStream({
      session: makeSession(),
      method: "GET",
      path: "/a",
      headers: {},
      raw: first.raw,
    });
    await wait(10);
    fake.emitControl({ type: "stream-open-ack", streamId: 1, statusCode: 200 });
    await one;

    const second = makeFakeSink();
    const two = capped.startHttpStream({
      session: makeSession(),
      method: "GET",
      path: "/b",
      headers: {},
      raw: second.raw,
    });
    await wait(10);
    fake.emitControl({ type: "stream-open-ack", streamId: 2, statusCode: 200 });
    await two;
    expect(second.raw.status).not.toHaveBeenCalled();
    capped.stop();
  });

  it("sweep: boşta kalan http akışı kapatılır", async () => {
    vi.useFakeTimers({ now: new Date(0) });
    const sweeping = new TunnelProxy(fake.channel, store, undefined, {
      idleTimeoutMs: 30000,
      sweepIntervalMs: 1000,
      now: () => Date.now(),
    });
    sweeping.initialize();
    const { raw } = makeFakeSink();
    const start = sweeping.startHttpStream({
      session: makeSession(),
      method: "GET",
      path: "/",
      headers: {},
      raw,
    });
    await vi.waitFor(
      () =>
        fake.sentControls.some(
          (m) => (m as { type: string }).type === "stream-open",
        ),
      { timeout: 2000 },
    );
    fake.emitControl({ type: "stream-open-ack", streamId: 1, statusCode: 200 });
    await start;
    vi.advanceTimersByTime(31000);
    expect(raw.destroy).toHaveBeenCalled();
    sweeping.stop();
    vi.useRealTimers();
  });

  it("logger varken akış kapanışı security kanalına düşer", async () => {
    const log = vi.fn().mockResolvedValue(undefined);
    const logged = new TunnelProxy(
      fake.channel,
      store,
      { log } as unknown as ILogger,
    );
    logged.initialize();
    const { raw } = makeFakeSink();
    const start = logged.startHttpStream({
      session: makeSession(),
      method: "GET",
      path: "/",
      headers: {},
      raw,
    });
    await wait(10);
    fake.emitControl({ type: "stream-open-ack", streamId: 1, statusCode: 200 });
    await start;
    fake.emitControl({ type: "stream-close", streamId: 1, reason: "fetch-error" });
    expect(log).toHaveBeenCalledWith(
      expect.objectContaining({
        category: "security",
        context: expect.objectContaining({ streamId: 1 }),
      }),
    );
    logged.stop();
  });
});

describe("TunnelProxy WS köprüsü (T3.3)", () => {
  let fake: ReturnType<typeof makeFakeChannel>;
  let store: FieldSessionStore;
  let proxy: TunnelProxy;

  beforeEach(() => {
    fake = makeFakeChannel();
    store = new FieldSessionStore();
    store.register(makeSession());
    proxy = new TunnelProxy(fake.channel, store, undefined);
    proxy.initialize();
  });

  afterEach(() => {
    proxy.stop();
  });

  function makeBrowserSocket() {
    const sent: Array<{ data: Buffer; binary: boolean }> = [];
    return {
      sent,
      send: (data: Buffer | string, options?: { binary?: boolean }) => {
        sent.push({ data: Buffer.from(data as Buffer), binary: options?.binary ?? false });
      },
      close: vi.fn(),
    };
  }

  it("101 ack → köprü açılır; WS_OP frame tarayıcıya iletilir", async () => {
    const socket = makeBrowserSocket();
    const start = proxy.startWsBridge({
      session: makeSession(),
      path: "/ws/telemetry",
      browserSocket: socket,
    });
    await wait(10);
    expect(fake.sentControls[0]).toMatchObject({
      type: "stream-open",
      upgrade: "websocket",
    });
    const sid = (fake.sentControls[0] as { streamId: number }).streamId;
    fake.emitControl({ type: "stream-open-ack", streamId: sid, statusCode: 101 });
    const streamId = await start;
    expect(streamId).toBe(sid);

    fake.emitBinary(
      codec.encode({
        streamId: sid,
        seq: 0,
        flags: FLAG_WS_OP,
        opcode: WS_OPCODE.Text,
        payload: new TextEncoder().encode("selam"),
      }),
    );
    expect(socket.sent).toHaveLength(1);
    expect(socket.sent[0].data.toString()).toBe("selam");
    expect(socket.sent[0].binary).toBe(false);
  });

  it("tarayıcı mesajı WS_OP frame'i olarak konteynere gider", async () => {
    const socket = makeBrowserSocket();
    const start = proxy.startWsBridge({
      session: makeSession(),
      path: "/ws/telemetry",
      browserSocket: socket,
    });
    await wait(10);
    const sid = (fake.sentControls[0] as { streamId: number }).streamId;
    fake.emitControl({ type: "stream-open-ack", streamId: sid, statusCode: 101 });
    const streamId = await start;
    expect(streamId).toBe(sid);

    proxy.sendWsToContainer(streamId, Buffer.from("subscribe"), false);
    const frame = codec.decode(new Uint8Array(fake.sentBinary[0])).unwrap();
    expect(frame.flags & FLAG_WS_OP).toBe(FLAG_WS_OP);
    expect(frame.opcode).toBe(WS_OPCODE.Text);
    expect(Buffer.from(frame.payload).toString()).toBe("subscribe");
  });

  it("konteyner stream-close → tarayıcı kapatılır", async () => {
    const socket = makeBrowserSocket();
    const start = proxy.startWsBridge({
      session: makeSession(),
      path: "/ws/telemetry",
      browserSocket: socket,
    });
    await wait(10);
    const sid = (fake.sentControls[0] as { streamId: number }).streamId;
    fake.emitControl({ type: "stream-open-ack", streamId: sid, statusCode: 101 });
    await start;
    fake.emitControl({ type: "stream-close", streamId: sid, reason: "ws-closed" });
    expect(socket.close).toHaveBeenCalled();
  });

  it("ack 101 değilse tarayıcı 1013 ile kapatılır", async () => {
    const socket = makeBrowserSocket();
    const start = proxy.startWsBridge({
      session: makeSession(),
      path: "/ws/telemetry",
      browserSocket: socket,
    });
    await wait(10);
    const sid = (fake.sentControls[0] as { streamId: number }).streamId;
    fake.emitControl({ type: "stream-open-ack", streamId: sid, statusCode: 503 });
    await start;
    expect(socket.close).toHaveBeenCalledWith(1013);
  });

  it("closeWs → stream-close kontrolü gönderilir", async () => {
    const socket = makeBrowserSocket();
    const start = proxy.startWsBridge({
      session: makeSession(),
      path: "/ws/telemetry",
      browserSocket: socket,
    });
    await wait(10);
    const sid = (fake.sentControls[0] as { streamId: number }).streamId;
    fake.emitControl({ type: "stream-open-ack", streamId: sid, statusCode: 101 });
    const streamId = await start;
    proxy.closeWs(streamId!, "browser-closed");
    expect(
      fake.sentControls.some(
        (m) =>
          (m as { type: string; streamId: number; reason: string }).type ===
            "stream-close" &&
          (m as { streamId: number }).streamId === sid &&
          (m as { reason: string }).reason === "browser-closed",
      ),
    ).toBe(true);
  });

  it("RST frame → tarayıcı 1011 ile kapatılır", async () => {
    const socket = makeBrowserSocket();
    const start = proxy.startWsBridge({
      session: makeSession(),
      path: "/ws/telemetry",
      browserSocket: socket,
    });
    await wait(10);
    const sid = (fake.sentControls[0] as { streamId: number }).streamId;
    fake.emitControl({ type: "stream-open-ack", streamId: sid, statusCode: 101 });
    await start;
    fake.emitBinary(
      codec.encode({ streamId: sid, seq: 0, flags: FLAG_RST, payload: new Uint8Array(0) }),
    );
    expect(socket.close).toHaveBeenCalledWith(1011);
  });

  it("binary tarayıcı mesajı Binary opcode taşır", async () => {
    const socket = makeBrowserSocket();
    const start = proxy.startWsBridge({
      session: makeSession(),
      path: "/ws/telemetry",
      browserSocket: socket,
    });
    await wait(10);
    const sid = (fake.sentControls[0] as { streamId: number }).streamId;
    fake.emitControl({ type: "stream-open-ack", streamId: sid, statusCode: 101 });
    const streamId = await start;
    proxy.sendWsToContainer(streamId!, Buffer.from([1, 2, 3]), true);
    const frame = codec.decode(new Uint8Array(fake.sentBinary[0])).unwrap();
    expect(frame.opcode).toBe(WS_OPCODE.Binary);
  });

  it("bilinmeyen streamId'ye WS mesajı yok sayılır", () => {
    expect(() => proxy.sendWsToContainer(999, Buffer.from("x"), false)).not.toThrow();
    expect(() => proxy.closeWs(999, "x")).not.toThrow();
  });
});
