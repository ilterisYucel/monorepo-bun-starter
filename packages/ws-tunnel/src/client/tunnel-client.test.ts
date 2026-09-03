import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import http from "node:http";
import { WebSocketServer, WebSocket } from "ws";
import { TunnelClient } from "./tunnel-client";
import type { ITunnelChannel } from "../channel";
import { FrameCodec, FLAG_FIN, FLAG_RST, FLAG_WS_OP, WS_OPCODE } from "../codec";
import type { TunnelFrame } from "../codec";

/**
 * T3.2 — TunnelClient sözleşmesi (tasarım §5.2/§5.3 + §6 sorumluluk 3):
 *
 * - `stream-open` (HTTP): loopback fetch → `stream-open-ack {statusCode, headers}`
 *   → gövde ≤64 KiB parçalı BINARY frame'ler → FIN. Yönlendirme: `/api/*`,
 *   `/ws/*` → web-service URL; diğer her şey → statik URL (nginx SPA).
 * - Backpressure: kredi yoksa gövde frame'i GÖNDERİLMEZ; `stream-window`
 *   kredisi gelince akış devam eder (pencere 256 KiB — §5.2).
 * - İstek gövdesi (POST/PUT): BINARY frame'ler + FIN → fetch body (1 MiB tavan).
 * - `stream-open {upgrade:"websocket"}`: loopback WS köprüsü — ack 101; mesaj
 *   sınırları ve opcode'lar WS_OP bayrağıyla korunur; kapanma → `stream-close`.
 * - Limitler: eşzamanlı akış tavanı (16) → 503; `stream-close` (field) → iptal;
 *   boşta kalma süresi (idle) → otomatik kapanma (kırılganlık #2).
 */

interface FakeChannel extends ITunnelChannel {
  sentControls: unknown[];
  sentFrames: Buffer[];
  emit(message: unknown): void;
  emitFrame(buffer: Buffer): void;
}

function makeChannel(): FakeChannel {
  const subscribers = new Set<(message: unknown) => void>();
  const binarySubscribers = new Set<(data: Buffer) => void>();
  const sentControls: unknown[] = [];
  const sentFrames: Buffer[] = [];
  return {
    sentControls,
    sentFrames,
    onMessage: (subscriber) => {
      subscribers.add(subscriber);
      return () => subscribers.delete(subscriber);
    },
    onBinaryFrame: (subscriber) => {
      binarySubscribers.add(subscriber);
      return () => binarySubscribers.delete(subscriber);
    },
    sendControl: (message) => {
      sentControls.push(message);
    },
    sendBinary: (data) => {
      sentFrames.push(data);
    },
    emit: (message) => {
      subscribers.forEach((subscriber) => subscriber(message));
    },
    emitFrame: (buffer) => {
      binarySubscribers.forEach((subscriber) => subscriber(buffer));
    },
  };
}

const codec = new FrameCodec();

function decodedFrames(buffers: Buffer[]): TunnelFrame[] {
  return buffers.map((buffer) => {
    const result = codec.decode(new Uint8Array(buffer));
    if (result.isErr()) throw new Error("decode hatasi");
    return result.unwrap();
  });
}

async function startHttp(
  handler: http.RequestListener,
): Promise<{ server: http.Server; port: number }> {
  const server = http.createServer(handler);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const port = typeof address === "object" && address !== null ? address.port : 0;
  return { server, port };
}

function closeServer(server: http.Server): Promise<void> {
  return new Promise((resolve) => server.close(() => resolve()));
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

describe("TunnelClient (T3.2)", () => {
  let channel: FakeChannel;
  let client: TunnelClient;

  afterEach(async () => {
    client?.stop();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe("HTTP akışı", () => {
    it("stream-open → ack (durum + başlıklar) → gövde frame'leri + FIN", async () => {
      const upstream = await startHttp((req, res) => {
        res.setHeader("content-type", "text/html");
        res.writeHead(200);
        res.end("hello");
      });
      channel = makeChannel();
      client = TunnelClient.create({
        webServiceUrl: `http://127.0.0.1:${upstream.port}`,
        staticUrl: `http://127.0.0.1:${upstream.port}`,
      });
      client.attach(channel);

      channel.emit({
        type: "stream-open",
        streamId: 42,
        sessionId: "s-1",
        method: "GET",
        path: "/api/data/latest",
        headers: { accept: "application/json" },
      });
      channel.emit({ type: "stream-window", streamId: 42, credit: 1024 });

      await waitFor(
        () =>
          channel.sentControls.some(
            (m) => (m as { type: string }).type === "stream-open-ack",
          ),
        2000,
      );
      const ack = channel.sentControls.find(
        (m) => (m as { type: string }).type === "stream-open-ack",
      ) as { streamId: number; statusCode: number; headers?: Record<string, string> };
      expect(ack.streamId).toBe(42);
      expect(ack.statusCode).toBe(200);
      expect(ack.headers?.["content-type"]).toBe("text/html");

      await waitFor(() => channel.sentFrames.length >= 1, 2000);
      const frames = decodedFrames(channel.sentFrames);
      const payload = Buffer.concat(frames.map((f) => Buffer.from(f.payload)));
      expect(payload.toString()).toBe("hello");
      expect((frames.at(-1)?.flags ?? 0) & FLAG_FIN).toBe(FLAG_FIN);
      await closeServer(upstream.server);
    });

    it("yönlendirme: /api/* → web-service, diğer → statik", async () => {
      const web = await startHttp((req, res) => {
        res.end(`web:${req.url}`);
      });
      const statik = await startHttp((req, res) => {
        res.end(`static:${req.url}`);
      });
      channel = makeChannel();
      client = TunnelClient.create({
        webServiceUrl: `http://127.0.0.1:${web.port}`,
        staticUrl: `http://127.0.0.1:${statik.port}`,
      });
      client.attach(channel);

      channel.emit({
        type: "stream-open",
        streamId: 1,
        sessionId: "s-1",
        method: "GET",
        path: "/api/x",
      });
      channel.emit({ type: "stream-window", streamId: 1, credit: 1024 });
      channel.emit({
        type: "stream-open",
        streamId: 2,
        sessionId: "s-1",
        method: "GET",
        path: "/index.html",
      });
      channel.emit({ type: "stream-window", streamId: 2, credit: 1024 });

      await waitFor(() => channel.sentFrames.length >= 2, 2000);
      const bodies = channel.sentFrames.map((b) => {
        const f = codec.decode(new Uint8Array(b)).unwrap();
        return Buffer.from(f.payload).toString();
      });
      expect(bodies).toContain("web:/api/x");
      expect(bodies).toContain("static:/index.html");
      await closeServer(web.server);
      await closeServer(statik.server);
    });

    it("backpressure: kredi olmadan gövde gönderilmez, krediyle akar", async () => {
      const upstream = await startHttp((_req, res) => {
        res.end("A".repeat(100));
      });
      channel = makeChannel();
      client = TunnelClient.create({
        webServiceUrl: `http://127.0.0.1:${upstream.port}`,
        staticUrl: `http://127.0.0.1:${upstream.port}`,
        chunkSize: 64,
      });
      client.attach(channel);

      channel.emit({
        type: "stream-open",
        streamId: 7,
        sessionId: "s-1",
        method: "GET",
        path: "/api/x",
      });
      // kredi yok — yalnızca ack gelmeli
      await waitFor(
        () =>
          channel.sentControls.some(
            (m) => (m as { type: string }).type === "stream-open-ack",
          ),
        2000,
      );
      expect(channel.sentFrames).toHaveLength(0);

      // 64 bayt kredi → ilk 64 baytlık frame akar (FIN yok)
      channel.emit({ type: "stream-window", streamId: 7, credit: 64 });
      await waitFor(() => channel.sentFrames.length >= 1, 2000);
      const first = decodedFrames(channel.sentFrames);
      expect(
        first.reduce((sum, f) => sum + f.payload.length, 0),
      ).toBeLessThanOrEqual(64);
      expect((first.at(-1)?.flags ?? 0) & FLAG_FIN).toBe(0);

      // kalan kredi → gerisi + FIN
      channel.emit({ type: "stream-window", streamId: 7, credit: 100 });
      await waitFor(() => {
        const frames = decodedFrames(channel.sentFrames);
        return ((frames.at(-1)?.flags ?? 0) & FLAG_FIN) === FLAG_FIN;
      }, 2000);
      const all = decodedFrames(channel.sentFrames);
      expect(
        all.reduce((sum, f) => sum + f.payload.length, 0),
      ).toBe(100);
      await closeServer(upstream.server);
    });

    it("POST gövdesi: BINARY frame'ler + FIN → fetch body", async () => {
      let received = "";
      const upstream = await startHttp((req, res) => {
        req.on("data", (chunk) => (received += chunk.toString()));
        req.on("end", () => {
          res.end("ok");
        });
      });
      channel = makeChannel();
      client = TunnelClient.create({
        webServiceUrl: `http://127.0.0.1:${upstream.port}`,
        staticUrl: `http://127.0.0.1:${upstream.port}`,
      });
      client.attach(channel);

      channel.emit({
        type: "stream-open",
        streamId: 3,
        sessionId: "s-1",
        method: "POST",
        path: "/api/commands/execute",
      });
      const body = Buffer.from("body-content");
      channel.emitFrame(codec.encode({ streamId: 3, seq: 0, flags: FLAG_FIN, payload: new Uint8Array(body) }));
      channel.emit({ type: "stream-window", streamId: 3, credit: 1024 });

      await waitFor(() => received.length > 0, 2000);
      expect(received).toBe("body-content");
      await closeServer(upstream.server);
    });

    it("upstream 404 → ack 404", async () => {
      const upstream = await startHttp((_req, res) => {
        res.writeHead(404);
        res.end();
      });
      channel = makeChannel();
      client = TunnelClient.create({
        webServiceUrl: `http://127.0.0.1:${upstream.port}`,
        staticUrl: `http://127.0.0.1:${upstream.port}`,
      });
      client.attach(channel);

      channel.emit({
        type: "stream-open",
        streamId: 9,
        sessionId: "s-1",
        method: "GET",
        path: "/api/none",
      });
      channel.emit({ type: "stream-window", streamId: 9, credit: 1024 });

      await waitFor(
        () =>
          channel.sentControls.some(
            (m) =>
              (m as { type: string; statusCode: number }).type === "stream-open-ack" &&
              (m as { statusCode: number }).statusCode === 404,
          ),
        2000,
      );
      await closeServer(upstream.server);
    });

    it("akış tavanı aşılınca 503 + stream-close", () => {
      channel = makeChannel();
      client = TunnelClient.create({
        webServiceUrl: "http://127.0.0.1:1",
        staticUrl: "http://127.0.0.1:1",
        maxStreams: 2,
      });
      client.attach(channel);

      channel.emit({ type: "stream-open", streamId: 1, sessionId: "s", method: "GET", path: "/api/a" });
      channel.emit({ type: "stream-open", streamId: 2, sessionId: "s", method: "GET", path: "/api/b" });
      channel.emit({ type: "stream-open", streamId: 3, sessionId: "s", method: "GET", path: "/api/c" });

      const acks = channel.sentControls.filter(
        (m) => (m as { type: string }).type === "stream-open-ack",
      );
      expect(acks).toHaveLength(1);
      expect(acks[0]).toMatchObject({ streamId: 3, statusCode: 503 });
      expect(
        channel.sentControls.some(
          (m) =>
            (m as { type: string }).type === "stream-close" &&
            (m as { streamId: number }).streamId === 3,
        ),
      ).toBe(true);
      client.stop();
    });

    it("field stream-close → akış iptal edilir", async () => {
      const upstream = await startHttp((_req, res) => {
        res.write("x".repeat(50));
        setTimeout(() => res.end(), 200);
      });
      channel = makeChannel();
      client = TunnelClient.create({
        webServiceUrl: `http://127.0.0.1:${upstream.port}`,
        staticUrl: `http://127.0.0.1:${upstream.port}`,
      });
      client.attach(channel);

      channel.emit({ type: "stream-open", streamId: 11, sessionId: "s", method: "GET", path: "/api/x" });
      channel.emit({ type: "stream-window", streamId: 11, credit: 1024 });
      await waitFor(() => channel.sentFrames.length >= 1, 2000);
      channel.emit({ type: "stream-close", streamId: 11, reason: "client-abort" });
      const before = channel.sentFrames.length;
      await new Promise((resolve) => setTimeout(resolve, 300));
      expect(channel.sentFrames.length).toBe(before);
      await closeServer(upstream.server);
    });
  });

  describe("WS köprüsü (upgrade)", () => {
    let wss: WebSocketServer;
    let wsPort: number;
    const received: Array<{ data: Buffer; isBinary: boolean }> = [];

    beforeEach(async () => {
      received.length = 0;
      wss = new WebSocketServer({ port: 0, host: "127.0.0.1" });
      await new Promise<void>((resolve) => wss.on("listening", resolve));
      wsPort = (wss.address() as { port: number }).port;
      wss.on("connection", (socket) => {
        socket.on("message", (data, isBinary) => {
          received.push({ data: Buffer.from(data as Buffer), isBinary });
          socket.send(data, { binary: isBinary });
        });
      });
    });

    afterEach(async () => {
      client?.stop();
      vi.useRealTimers();
      for (const socket of wss.clients) socket.terminate();
      await new Promise<void>((resolve) => wss.close(() => resolve()));
    });

    it("upgrade → 101 ack + çift yönlü WS_OP frame'leri", async () => {
      channel = makeChannel();
      client = TunnelClient.create({
        webServiceUrl: `http://127.0.0.1:${wsPort}`,
        staticUrl: `http://127.0.0.1:${wsPort}`,
      });
      client.attach(channel);

      channel.emit({
        type: "stream-open",
        streamId: 5,
        sessionId: "s-1",
        method: "GET",
        path: "/ws/telemetry",
        upgrade: "websocket",
      });

      await waitFor(
        () =>
          channel.sentControls.some(
            (m) =>
              (m as { type: string; statusCode: number }).type === "stream-open-ack" &&
              (m as { statusCode: number }).statusCode === 101,
          ),
        2000,
      );

      // field → konteyner: WS_OP text frame
      channel.emitFrame(
        codec.encode({
          streamId: 5,
          seq: 0,
          flags: FLAG_WS_OP,
          opcode: WS_OPCODE.Text,
          payload: new TextEncoder().encode("subscribe"),
        }),
      );
      await waitFor(() => received.length === 1, 2000);
      expect(received[0]?.data.toString()).toBe("subscribe");
      expect(received[0]?.isBinary).toBe(false);

      // konteyner → field: gelen WS mesajı WS_OP frame'ine sarılır
      await waitFor(() => channel.sentFrames.length >= 1, 2000);
      const first = channel.sentFrames[0];
      expect(first).toBeDefined();
      const frame = codec.decode(new Uint8Array(first!)).unwrap();
      expect(frame.flags & FLAG_WS_OP).toBe(FLAG_WS_OP);
      expect(frame.opcode).toBe(WS_OPCODE.Text);
      expect(Buffer.from(frame.payload).toString()).toBe("subscribe");
    });

    it("loopback WS kapanınca stream-close gönderilir", async () => {
      channel = makeChannel();
      client = TunnelClient.create({
        webServiceUrl: `http://127.0.0.1:${wsPort}`,
        staticUrl: `http://127.0.0.1:${wsPort}`,
      });
      client.attach(channel);

      channel.emit({
        type: "stream-open",
        streamId: 6,
        sessionId: "s-1",
        method: "GET",
        path: "/ws/telemetry",
        upgrade: "websocket",
      });
      await waitFor(
        () =>
          channel.sentControls.some(
            (m) => (m as { type: string }).type === "stream-open-ack",
          ),
        2000,
      );
      // karşı uç bağlantıyı kapatır
      for (const socket of wss.clients) socket.close();
      await waitFor(
        () =>
          channel.sentControls.some(
            (m) =>
              (m as { type: string; streamId: number }).type === "stream-close" &&
              (m as { streamId: number }).streamId === 6,
          ),
        2000,
      );
    });

    it("boşta kalan akış idle timeout ile kapatılır", async () => {
      vi.useFakeTimers({ now: new Date(0) });
      channel = makeChannel();
      client = TunnelClient.create({
        webServiceUrl: `http://127.0.0.1:${wsPort}`,
        staticUrl: `http://127.0.0.1:${wsPort}`,
        idleTimeoutMs: 30000,
        sweepIntervalMs: 1000,
      });
      client.attach(channel);

      channel.emit({
        type: "stream-open",
        streamId: 8,
        sessionId: "s-1",
        method: "GET",
        path: "/ws/telemetry",
        upgrade: "websocket",
      });
      // vi.waitFor fake timer'larla uyumlu bekler (gerçek WS olayları + mock saat)
      await vi.waitFor(
        () =>
          channel.sentControls.some(
            (m) => (m as { type: string }).type === "stream-open-ack",
          ),
        { timeout: 2000 },
      );
      vi.advanceTimersByTime(31000);
      expect(
        channel.sentControls.some(
          (m) =>
            (m as { type: string; streamId: number }).type === "stream-close" &&
            (m as { streamId: number }).streamId === 8,
        ),
      ).toBe(true);
    });
  });

  describe("kapsama (hata yolları + limitler)", () => {
    it("bilinmeyen streamId'li window/close/binary yok sayılır", () => {
      channel = makeChannel();
      client = TunnelClient.create({
        webServiceUrl: "http://127.0.0.1:1",
        staticUrl: "http://127.0.0.1:1",
      });
      client.attach(channel);
      channel.emit({ type: "stream-window", streamId: 99, credit: 10 });
      channel.emit({ type: "stream-close", streamId: 99, reason: "x" });
      channel.emit({ type: "bilinmeyen" });
      channel.emitFrame(Buffer.from([1, 2, 3])); // malform frame
      channel.emitFrame(
        codec.encode({ streamId: 98, seq: 0, flags: 0, payload: new Uint8Array(0) }),
      );
      expect(channel.sentControls).toHaveLength(0);
      expect(channel.sentFrames).toHaveLength(0);
      client.stop();
    });

    it("kredi bekleyen akış stream-close ile temiz kapanır", async () => {
      const upstream = await startHttp((_req, res) => {
        res.end("x".repeat(50));
      });
      channel = makeChannel();
      client = TunnelClient.create({
        webServiceUrl: `http://127.0.0.1:${upstream.port}`,
        staticUrl: `http://127.0.0.1:${upstream.port}`,
      });
      client.attach(channel);
      channel.emit({
        type: "stream-open",
        streamId: 21,
        sessionId: "s",
        method: "GET",
        path: "/api/x",
      });
      // kredi YOK — fetch gövdesi bekliyor; kapat
      channel.emit({ type: "stream-close", streamId: 21, reason: "abort" });
      await new Promise((resolve) => setTimeout(resolve, 200));
      expect(channel.sentFrames).toHaveLength(0);
      await closeServer(upstream.server);
    });

    it("ack sonrası kredi beklerken kapanma → çökme/çıkış frame'i yok", async () => {
      const upstream = await startHttp((_req, res) => {
        res.end("x".repeat(50));
      });
      channel = makeChannel();
      client = TunnelClient.create({
        webServiceUrl: `http://127.0.0.1:${upstream.port}`,
        staticUrl: `http://127.0.0.1:${upstream.port}`,
      });
      client.attach(channel);
      channel.emit({
        type: "stream-open",
        streamId: 31,
        sessionId: "s",
        method: "GET",
        path: "/api/x",
      });
      await waitFor(
        () =>
          channel.sentControls.some(
            (m) => (m as { type: string }).type === "stream-open-ack",
          ),
        2000,
      );
      channel.emit({ type: "stream-close", streamId: 31, reason: "abort" });
      await new Promise((resolve) => setTimeout(resolve, 200));
      const ackSends = channel.sentFrames.length;
      expect(ackSends).toBe(0);
      await closeServer(upstream.server);
    });

    it("gövde ortasında kapanma → akış durur (abort)", async () => {
      const upstream = await startHttp((_req, res) => {
        res.writeHead(200);
        res.write("x".repeat(100));
        setTimeout(() => res.end(), 200);
      });
      channel = makeChannel();
      client = TunnelClient.create({
        webServiceUrl: `http://127.0.0.1:${upstream.port}`,
        staticUrl: `http://127.0.0.1:${upstream.port}`,
        chunkSize: 32,
      });
      client.attach(channel);
      channel.emit({
        type: "stream-open",
        streamId: 32,
        sessionId: "s",
        method: "GET",
        path: "/api/x",
      });
      channel.emit({ type: "stream-window", streamId: 32, credit: 1024 });
      await waitFor(() => channel.sentFrames.length >= 1, 2000);
      channel.emit({ type: "stream-close", streamId: 32, reason: "abort" });
      const before = channel.sentFrames.length;
      await new Promise((resolve) => setTimeout(resolve, 300));
      expect(channel.sentFrames.length).toBe(before);
      await closeServer(upstream.server);
    });

    it("upstream erişilemez → ack 502 + stream-close", async () => {
      channel = makeChannel();
      client = TunnelClient.create({
        webServiceUrl: "http://127.0.0.1:1",
        staticUrl: "http://127.0.0.1:1",
      });
      client.attach(channel);
      channel.emit({
        type: "stream-open",
        streamId: 22,
        sessionId: "s",
        method: "GET",
        path: "/api/x",
      });
      await waitFor(
        () =>
          channel.sentControls.some(
            (m) =>
              (m as { type: string; statusCode: number }).type === "stream-open-ack" &&
              (m as { statusCode: number }).statusCode === 502,
          ),
        2000,
      );
      expect(
        channel.sentControls.some(
          (m) => (m as { type: string }).type === "stream-close",
        ),
      ).toBe(true);
    });

    it("gövdesiz yanıt (204) → yalnızca FIN frame", async () => {
      const upstream = await startHttp((_req, res) => {
        res.writeHead(204);
        res.end();
      });
      channel = makeChannel();
      client = TunnelClient.create({
        webServiceUrl: `http://127.0.0.1:${upstream.port}`,
        staticUrl: `http://127.0.0.1:${upstream.port}`,
      });
      client.attach(channel);
      channel.emit({
        type: "stream-open",
        streamId: 23,
        sessionId: "s",
        method: "GET",
        path: "/api/x",
      });
      channel.emit({ type: "stream-window", streamId: 23, credit: 1024 });
      await waitFor(() => channel.sentFrames.length >= 1, 2000);
      const frames = decodedFrames(channel.sentFrames);
      expect(frames).toHaveLength(1);
      expect(frames[0].flags & FLAG_FIN).toBe(FLAG_FIN);
      expect(frames[0].payload).toHaveLength(0);
      await closeServer(upstream.server);
    });

    it("istek gövdesi tavan aşımı → RST + stream-close", async () => {
      channel = makeChannel();
      client = TunnelClient.create({
        webServiceUrl: "http://127.0.0.1:1",
        staticUrl: "http://127.0.0.1:1",
        maxRequestBody: 10,
      });
      client.attach(channel);
      channel.emit({
        type: "stream-open",
        streamId: 24,
        sessionId: "s",
        method: "POST",
        path: "/api/x",
      });
      channel.emitFrame(
        codec.encode({
          streamId: 24,
          seq: 0,
          flags: FLAG_FIN,
          payload: new Uint8Array(20),
        }),
      );
      const frames = decodedFrames(channel.sentFrames);
      expect(frames[0].flags & FLAG_RST).toBe(FLAG_RST);
      expect(
        channel.sentControls.some(
          (m) =>
            (m as { type: string }).type === "stream-close" &&
            (m as { reason: string }).reason === "request-body-too-large",
        ),
      ).toBe(true);
    });

    it("GET akışında gövde frame'i yok sayılır", async () => {
      const upstream = await startHttp((_req, res) => {
        res.end("ok");
      });
      channel = makeChannel();
      client = TunnelClient.create({
        webServiceUrl: `http://127.0.0.1:${upstream.port}`,
        staticUrl: `http://127.0.0.1:${upstream.port}`,
      });
      client.attach(channel);
      channel.emit({
        type: "stream-open",
        streamId: 25,
        sessionId: "s",
        method: "GET",
        path: "/api/x",
      });
      // GET — awaitingBody false; gövde frame'i yok sayılmalı
      channel.emitFrame(
        codec.encode({
          streamId: 25,
          seq: 0,
          flags: FLAG_FIN,
          payload: new TextEncoder().encode("ignored"),
        }),
      );
      channel.emit({ type: "stream-window", streamId: 25, credit: 1024 });
      await waitFor(() => channel.sentFrames.length >= 1, 2000);
      const payload = Buffer.concat(
        decodedFrames(channel.sentFrames).map((f) => Buffer.from(f.payload)),
      ).toString();
      expect(payload).toBe("ok");
      await closeServer(upstream.server);
    });

    it("upstream gövde ortasında koparsa stream-close fetch-error", async () => {
      const upstream = await startHttp((_req, res) => {
        res.writeHead(200);
        res.write("x".repeat(50));
        setTimeout(() => res.destroy(), 100);
      });
      channel = makeChannel();
      client = TunnelClient.create({
        webServiceUrl: `http://127.0.0.1:${upstream.port}`,
        staticUrl: `http://127.0.0.1:${upstream.port}`,
      });
      client.attach(channel);
      channel.emit({
        type: "stream-open",
        streamId: 26,
        sessionId: "s",
        method: "GET",
        path: "/api/x",
      });
      channel.emit({ type: "stream-window", streamId: 26, credit: 1024 });
      await waitFor(
        () =>
          channel.sentControls.some(
            (m) =>
              (m as { type: string; reason: string }).type === "stream-close" &&
              (m as { reason: string }).reason === "fetch-error",
          ),
        3000,
      );
      await closeServer(upstream.server);
    });

    it("WS köprüsü: WS olmayan upstream → stream-close ws-error", async () => {
      const plain = await startHttp((_req, res) => {
        res.writeHead(400);
        res.end();
      });
      channel = makeChannel();
      client = TunnelClient.create({
        webServiceUrl: `http://127.0.0.1:${plain.port}`,
        staticUrl: `http://127.0.0.1:${plain.port}`,
      });
      client.attach(channel);
      channel.emit({
        type: "stream-open",
        streamId: 27,
        sessionId: "s",
        method: "GET",
        path: "/ws/telemetry",
        upgrade: "websocket",
      });
      await waitFor(
        () =>
          channel.sentControls.some(
            (m) =>
              (m as { type: string; reason: string }).type === "stream-close" &&
              (m as { reason: string }).reason === "ws-error",
          ),
        2000,
      );
      await closeServer(plain.server);
    });

    it("WS köprüsü: binary opcode upstream'e binary iletilir", async () => {
      const binaryWss = new WebSocketServer({ port: 0, host: "127.0.0.1" });
      await new Promise<void>((resolve) => binaryWss.on("listening", resolve));
      const binPort = (binaryWss.address() as { port: number }).port;
      const received: Array<{ data: Buffer; isBinary: boolean }> = [];
      binaryWss.on("connection", (socket) => {
        socket.on("message", (data, isBinary) => {
          received.push({ data: Buffer.from(data as Buffer), isBinary });
        });
      });
      channel = makeChannel();
      client = TunnelClient.create({
        webServiceUrl: `http://127.0.0.1:${binPort}`,
        staticUrl: `http://127.0.0.1:${binPort}`,
      });
      client.attach(channel);
      channel.emit({
        type: "stream-open",
        streamId: 33,
        sessionId: "s",
        method: "GET",
        path: "/ws/telemetry",
        upgrade: "websocket",
      });
      await waitFor(
        () =>
          channel.sentControls.some(
            (m) => (m as { type: string }).type === "stream-open-ack",
          ),
        2000,
      );
      channel.emitFrame(
        codec.encode({
          streamId: 33,
          seq: 0,
          flags: FLAG_WS_OP,
          opcode: WS_OPCODE.Binary,
          payload: new Uint8Array([0, 1, 2]),
        }),
      );
      await waitFor(() => received.length === 1, 2000);
      expect(received[0].isBinary).toBe(true);
      expect(received[0].data).toEqual(Buffer.from([0, 1, 2]));
      for (const socket of binaryWss.clients) socket.terminate();
      await new Promise<void>((resolve) => binaryWss.close(() => resolve()));
    });

    it("kapanmış akışa gelen WS_OP frame'i yok sayılır", async () => {
      const goneWss = new WebSocketServer({ port: 0, host: "127.0.0.1" });
      await new Promise<void>((resolve) => goneWss.on("listening", resolve));
      const gonePort = (goneWss.address() as { port: number }).port;
      goneWss.on("connection", () => {});
      channel = makeChannel();
      client = TunnelClient.create({
        webServiceUrl: `http://127.0.0.1:${gonePort}`,
        staticUrl: `http://127.0.0.1:${gonePort}`,
      });
      client.attach(channel);
      channel.emit({
        type: "stream-open",
        streamId: 34,
        sessionId: "s",
        method: "GET",
        path: "/ws/telemetry",
        upgrade: "websocket",
      });
      await waitFor(
        () =>
          channel.sentControls.some(
            (m) => (m as { type: string }).type === "stream-open-ack",
          ),
        2000,
      );
      channel.emit({ type: "stream-close", streamId: 34, reason: "x" });
      expect(() =>
        channel.emitFrame(
          codec.encode({
            streamId: 34,
            seq: 0,
            flags: FLAG_WS_OP,
            opcode: WS_OPCODE.Text,
            payload: new TextEncoder().encode("late"),
          }),
        ),
      ).not.toThrow();
      for (const socket of goneWss.clients) socket.terminate();
      await new Promise<void>((resolve) => goneWss.close(() => resolve()));
    });
  });

  it("FIN sonrası akış temizlenir — sıradaki stream-open 503 ALMAZ (sızıntı regresyonu)", async () => {
    const upstream = await startHttp((_req, res) => {
      res.end("kucuk-govde");
    });
    channel = makeChannel();
    client = TunnelClient.create({
      webServiceUrl: `http://127.0.0.1:${upstream.port}`,
      staticUrl: `http://127.0.0.1:${upstream.port}`,
      maxStreams: 2,
    });
    client.attach(channel);

    // 1. akış: tamamlanır (FIN)
    channel.emit({ type: "stream-open", streamId: 1, sessionId: "s", method: "GET", path: "/a" });
    channel.emit({ type: "stream-window", streamId: 1, credit: 1024 });
    await waitFor(() => {
      const frames = decodedFrames(channel.sentFrames);
      return frames.some((f) => f.streamId === 1 && (f.flags & FLAG_FIN) === FLAG_FIN);
    }, 2000);

    // 2. akış: temizlenmiş olmasaydı 16 tavanı... burada 2 tavanıyla 503 alırdı
    channel.emit({ type: "stream-open", streamId: 2, sessionId: "s", method: "GET", path: "/b" });
    channel.emit({ type: "stream-window", streamId: 2, credit: 1024 });
    await waitFor(
      () =>
        channel.sentControls.some(
          (m) =>
            (m as { type: string; streamId: number }).type === "stream-open-ack" &&
            (m as { streamId: number }).streamId === 2 &&
            (m as { statusCode: number }).statusCode === 200,
        ),
      2000,
    );
    expect(
      channel.sentControls.some(
        (m) =>
          (m as { statusCode: number | undefined }).statusCode === 503,
      ),
    ).toBe(false);
    await closeServer(upstream.server);
  });

  it("gzip basliklari ack'e TASINMAZ (content-encoding/content-length strip)", async () => {
    const upstream = await startHttp((_req, res) => {
      res.setHeader("content-type", "application/json");
      res.setHeader("content-encoding", "gzip");
      res.setHeader("content-length", "99");
      res.end('{"ok":true}');
    });
    channel = makeChannel();
    client = TunnelClient.create({
      webServiceUrl: `http://127.0.0.1:${upstream.port}`,
      staticUrl: `http://127.0.0.1:${upstream.port}`,
    });
    client.attach(channel);
    channel.emit({ type: "stream-open", streamId: 40, sessionId: "s", method: "GET", path: "/api/x" });
    channel.emit({ type: "stream-window", streamId: 40, credit: 1024 });
    await waitFor(
      () =>
        channel.sentControls.some(
          (m) => (m as { type: string }).type === "stream-open-ack",
        ),
      2000,
    );
    const ack = channel.sentControls.find(
      (m) => (m as { type: string }).type === "stream-open-ack",
    ) as { headers?: Record<string, string> };
    expect(ack.headers?.["content-type"]).toBe("application/json");
    expect(ack.headers?.["content-encoding"]).toBeUndefined();
    expect(ack.headers?.["content-length"]).toBeUndefined();
    await closeServer(upstream.server);
  });

  describe("max yaş sweep", () => {
    let wss: WebSocketServer;
    let wsPort: number;

    beforeEach(async () => {
      wss = new WebSocketServer({ port: 0, host: "127.0.0.1" });
      await new Promise<void>((resolve) => wss.on("listening", resolve));
      wsPort = (wss.address() as { port: number }).port;
      wss.on("connection", () => {});
    });

    afterEach(async () => {
      client?.stop();
      vi.useRealTimers();
      for (const socket of wss.clients) socket.terminate();
      await new Promise<void>((resolve) => wss.close(() => resolve()));
    });

    it("azami yaş dolan akış max-age ile kapatılır", async () => {
      vi.useFakeTimers({ now: new Date(0) });
      channel = makeChannel();
      client = TunnelClient.create({
        webServiceUrl: `http://127.0.0.1:${wsPort}`,
        staticUrl: `http://127.0.0.1:${wsPort}`,
        idleTimeoutMs: 60 * 60 * 1000,
        maxAgeMs: 1000,
        sweepIntervalMs: 100,
      });
      client.attach(channel);
      channel.emit({
        type: "stream-open",
        streamId: 28,
        sessionId: "s",
        method: "GET",
        path: "/ws/telemetry",
        upgrade: "websocket",
      });
      await vi.waitFor(
        () =>
          channel.sentControls.some(
            (m) => (m as { type: string }).type === "stream-open-ack",
          ),
        { timeout: 2000 },
      );
      vi.advanceTimersByTime(1100);
      expect(
        channel.sentControls.some(
          (m) =>
            (m as { type: string; reason: string }).type === "stream-close" &&
            (m as { reason: string }).reason === "max-age",
        ),
      ).toBe(true);
    });
  });
});
