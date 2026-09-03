import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { FieldConnector } from "./field-connector";
import type {
  ISocketClient,
  ISocketClientFactory,
  ISnapshotSource,
} from "../channel";
import { ReconnectDelay } from "./reconnect-delay";


import { FIELD_PROTOCOL_VERSION } from "../protocol";

import type { TunnelTelemetryPoint } from "../types";


/**
 * T2.1b — FieldConnector sözleşmesi (tasarım §4.3 + §6 diyagramı):
 *
 * Durum makinesi: offline → connecting → registered → connected; hata/401/timeout
 * → backoff → connecting (exp(2^n·1s)+jitter, max 60s); stop() → offline.
 *
 * - start(): offline değilse no-op; connecting'e geçer, ilk URL'i dener.
 * - open → register {containerId, protocolVersion:1} gönderilir; registerTimeoutMs
 *   içinde ack gelmezse backoff.
 * - register-ack ok → İLK heartbeat gönderilir → connected; heartbeat her
 *   heartbeatIntervalMs'de bir; telemetri snapshot bağlantı anında + her
 *   telemetryIntervalMs'de bir push edilir (boş snapshot push edilmez).
 * - register-ack rejected / 401 pre-upgrade → backoff + security logu
 *   (ws_register_rejected); URL listesi sırayla denenir.
 * - Liveness: pong alınmazsa livenessTimeoutMs sonra bağlantı yarı-ölü sayılır
 *   (WS kopması/yarı-açık bağlantı) → kapat + backoff.
 * - stop(): kapatır, yeniden bağlanmaz; tekrar start() edilebilir.
 * - operational config (T2.5): register-ack.config / config-update ile aralıklar
 *   restart'sız değişir; geçersiz config reddedilir (field_config_rejected),
 *   eski config korunur.
 */

interface FakeSocket {
  client: ISocketClient;
  sent: string[];
  binary: Uint8Array[];
  emitOpen(): void;
  emitMessage(raw: string): void;
  emitBinary(data: Buffer): void;
  emitClose(): void;
  emitError(error: Error): void;
  emitPong(): void;
  emitRejected(statusCode: number): void;
  readonly closed: boolean;
}

function makeFakeSocket(): FakeSocket {
  const handlers: Record<string, (arg?: unknown) => void> = {};
  const sent: string[] = [];
  const binary: Uint8Array[] = [];
  const state = { closed: false, open: true };
  const on = (event: string, cb: (arg?: unknown) => void) => {
    handlers[event] = cb;
  };
  const client: ISocketClient = {
    send: (data: string) => {
      sent.push(data);
    },
    sendBinary: (data: Uint8Array) => {
      binary.push(data);
    },
    ping: vi.fn(),
    close: vi.fn(() => {
      state.closed = true;
      state.open = false;
    }),
    onOpen: (cb) => on("open", cb),
    onMessage: (cb) => on("message", cb),
    onBinaryMessage: (cb) => on("binary-message", cb),
    onClose: (cb) => on("close", cb),
    onError: (cb) => on("error", cb),
    onPong: (cb) => on("pong", cb),
    onRejected: (cb) => on("rejected", cb),
    readyState: () => (state.open ? "open" : "closed"),
  };
  return {
    client,
    sent,
    binary,
    get closed() {
      return state.closed;
    },
    emitOpen: () => handlers.open?.(),
    emitMessage: (raw) => handlers.message?.(raw),
    emitBinary: (data: Buffer) => handlers["binary-message"]?.(data),
    emitClose: () => handlers.close?.(),
    emitError: (error) => handlers.error?.(error),
    emitPong: () => handlers.pong?.(),
    emitRejected: (statusCode) => handlers.rejected?.(statusCode),
  };
}

interface FakeFactory extends ISocketClientFactory {
  created: Array<{ url: string; headers: Record<string, string>; socket: FakeSocket }>;
}

function makeFactory(): FakeFactory {
  const created: FakeFactory["created"] = [];
  return {
    created,
    create: (url, headers) => {
      const socket = makeFakeSocket();
      created.push({ url, headers, socket });
      return socket.client;
    },
  };
}

function makeConfig(overrides: Partial<FieldConnectorTestConfig> = {}) {
  return {
    wsUrls: ["ws://field-a:5002", "ws://field-b:5002"],
    token: "service-token-abcdef",
    containerId: "container-1",
    heartbeatIntervalMs: 15000,
    telemetryIntervalMs: 15000,
    registerTimeoutMs: 10000,
    livenessTimeoutMs: 60000,
    ...overrides,
  };
}

type FieldConnectorTestConfig = ReturnType<typeof makeConfig>;

function makeLogger() {
  const log = vi.fn().mockResolvedValue(undefined);
  return { logger: { log }, log };
}

function makeSnapshot(data: TunnelTelemetryPoint[] = [], error?: Error) {
  const snapshot = vi.fn().mockImplementation(async () => {
    if (error) throw error;
    return data;
  });
  return snapshot;
}

const sampleTelemetry: TunnelTelemetryPoint[] = [
  { deviceId: "bsc-1", name: "Voltage", value: 750 },
];

describe("FieldConnector (T2.1b)", () => {
  let factory: FakeFactory;
  let logger: ReturnType<typeof makeLogger>;
  let snapshot: ReturnType<typeof makeSnapshot>;
  let connector: FieldConnector;

  // vitest fake timers Date.now'u da mock'lar — tick'ler gerçek saati görür.
  const clock = () => Date.now();

  beforeEach(() => {
    vi.useFakeTimers({ now: new Date(0) });
    factory = makeFactory();
    logger = makeLogger();
    snapshot = makeSnapshot();
    connector = new FieldConnector(
      makeConfig(),
      factory,
      { snapshot },
      new ReconnectDelay({ baseMs: 1000, maxMs: 60000, jitterSpanMs: 0, jitter: () => 0 }),
      logger.logger,
      clock,
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("start() / bağlanma", () => {
    it("start() → connecting + ilk URL'e Bearer'lı bağlanır", () => {
      void connector.start();
      expect(connector.state()).toBe("connecting");
      expect(factory.created).toHaveLength(1);
      expect(factory.created[0].url).toBe("ws://field-a:5002");
      expect(factory.created[0].headers.Authorization).toBe(
        "Bearer service-token-abcdef",
      );
    });

    it("open sonrası register mesajı gönderir (containerId + protocolVersion)", () => {
      void connector.start();
      factory.created[0].socket.emitOpen();
      expect(factory.created[0].socket.sent).toHaveLength(1);
      expect(JSON.parse(factory.created[0].socket.sent[0])).toEqual({
        type: "register",
        containerId: "container-1",
        protocolVersion: FIELD_PROTOCOL_VERSION,
      });
    });

    it("çift start() no-op — ikinci soket açılmaz", () => {
      void connector.start();
      void connector.start();
      expect(factory.created).toHaveLength(1);
    });
  });

  describe("register-ack → connected akışı", () => {
    beforeEach(() => {
      void connector.start();
      factory.created[0].socket.emitOpen();
    });

    it("ack ok → ilk heartbeat + connected + snapshot push", async () => {
      factory.created[0].socket.emitMessage(
        JSON.stringify({ type: "register-ack", status: "ok", serverTime: "2026-08-25T10:00:00.000Z" }),
      );
      expect(connector.state()).toBe("connected");
      expect(connector.fieldConnected()).toBe(true);
      const sent = factory.created[0].socket.sent.map((s) => JSON.parse(s));
      expect(sent[1]).toMatchObject({ type: "heartbeat", ts: 0 });
      await vi.advanceTimersByTimeAsync(0);
      expect(snapshot).toHaveBeenCalled();
    });

    it("ack ok → field_connected bilgi logu", () => {
      factory.created[0].socket.emitMessage(
        JSON.stringify({ type: "register-ack", status: "ok", serverTime: "2026-08-25T10:00:00.000Z" }),
      );
      expect(logger.log).toHaveBeenCalledWith(
        expect.objectContaining({ eventCode: "field_connected" }),
      );
    });

    it("heartbeat her 15 sn'de bir gönderilir", () => {
      factory.created[0].socket.emitMessage(
        JSON.stringify({ type: "register-ack", status: "ok", serverTime: "now" }),
      );
      const before = factory.created[0].socket.sent.length;
      vi.advanceTimersByTime(15000);
      expect(factory.created[0].socket.sent.length).toBe(before + 1);
      expect(JSON.parse(factory.created[0].socket.sent[factory.created[0].socket.sent.length - 1])).toMatchObject({
        type: "heartbeat",
        ts: 15000,
      });
      expect(connector.lastHeartbeatAt()).toBe(15000);
    });

    it("telemetri snapshot her 15 sn'de bir push edilir (boş veri push edilmez)", async () => {
      snapshot.mockResolvedValue(sampleTelemetry);
      factory.created[0].socket.emitMessage(
        JSON.stringify({ type: "register-ack", status: "ok", serverTime: "now" }),
      );
      await vi.advanceTimersByTimeAsync(0);
      const before = factory.created[0].socket.sent.length;
      await vi.advanceTimersByTimeAsync(15000);
      expect(factory.created[0].socket.sent.length).toBe(before + 2); // heartbeat + telemetry
      const last = JSON.parse(factory.created[0].socket.sent[factory.created[0].socket.sent.length - 1]);
      expect(last).toMatchObject({ type: "telemetry", data: sampleTelemetry });
    });

    it("boş snapshot telemetry frame'i üretmez", async () => {
      factory.created[0].socket.emitMessage(
        JSON.stringify({ type: "register-ack", status: "ok", serverTime: "now" }),
      );
      await vi.advanceTimersByTimeAsync(0);
      const types = factory.created[0].socket.sent.map((s) => JSON.parse(s).type);
      expect(types).not.toContain("telemetry");
    });

    it("snapshot hatası bağlantıyı etkilemez (kademeli bozulma)", async () => {
      snapshot.mockRejectedValue(new Error("redis down"));
      factory.created[0].socket.emitMessage(
        JSON.stringify({ type: "register-ack", status: "ok", serverTime: "now" }),
      );
      await vi.advanceTimersByTimeAsync(0);
      expect(connector.state()).toBe("connected");
    });
  });

  describe("backoff / yeniden bağlanma", () => {
    it("connected iken WS kapanırsa backoff → 1 sn sonra yeniden bağlanır", () => {
      void connector.start();
      factory.created[0].socket.emitOpen();
      factory.created[0].socket.emitMessage(
        JSON.stringify({ type: "register-ack", status: "ok", serverTime: "now" }),
      );
      factory.created[0].socket.emitClose();
      expect(connector.state()).toBe("backoff");
      expect(connector.fieldConnected()).toBe(false);
      vi.advanceTimersByTime(1000);
      expect(connector.state()).toBe("connecting");
      expect(factory.created).toHaveLength(2);
    });

    it("kopuş warn logu (ws_connection_lost) üretir", () => {
      void connector.start();
      factory.created[0].socket.emitOpen();
      factory.created[0].socket.emitMessage(
        JSON.stringify({ type: "register-ack", status: "ok", serverTime: "now" }),
      );
      factory.created[0].socket.emitClose();
      expect(logger.log).toHaveBeenCalledWith(
        expect.objectContaining({ eventCode: "ws_connection_lost" }),
      );
    });

    it("üstel backoff: 1, 2, 4 sn (jitter 0)", () => {
      void connector.start();
      // 1. deneme: open + kapanma (register yok)
      factory.created[0].socket.emitOpen();
      factory.created[0].socket.emitClose();
      vi.advanceTimersByTime(1000);
      expect(factory.created).toHaveLength(2);
      // 2. deneme kapanır
      factory.created[1].socket.emitClose();
      vi.advanceTimersByTime(2000);
      expect(factory.created).toHaveLength(3);
      // 3. deneme kapanır
      factory.created[2].socket.emitClose();
      vi.advanceTimersByTime(4000);
      expect(factory.created).toHaveLength(4);
    });

    it("başarılı bağlantı deneme sayacını sıfırlar", () => {
      void connector.start();
      factory.created[0].socket.emitOpen();
      factory.created[0].socket.emitClose();
      vi.advanceTimersByTime(1000);
      // 2. deneme başarılı
      factory.created[1].socket.emitOpen();
      factory.created[1].socket.emitMessage(
        JSON.stringify({ type: "register-ack", status: "ok", serverTime: "now" }),
      );
      expect(connector.state()).toBe("connected");
      // kopuş → tekrar 1 sn backoff (sayaç sıfırlandı)
      factory.created[1].socket.emitClose();
      vi.advanceTimersByTime(1000);
      expect(factory.created).toHaveLength(3);
    });

    it("register timeout (10 sn) → backoff", () => {
      void connector.start();
      factory.created[0].socket.emitOpen();
      vi.advanceTimersByTime(10000);
      expect(connector.state()).toBe("backoff");
      expect(factory.created[0].socket.closed).toBe(true);
    });

    it("register-ack rejected → backoff + security logu", () => {
      void connector.start();
      factory.created[0].socket.emitOpen();
      factory.created[0].socket.emitMessage(
        JSON.stringify({ type: "register-ack", status: "rejected", serverTime: "now" }),
      );
      expect(connector.state()).toBe("backoff");
      expect(logger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          eventCode: "ws_register_rejected",
          category: "security",
        }),
      );
    });

    it("401 pre-upgrade → sıradaki URL denenir; tümü reddedilirse backoff", () => {
      void connector.start();
      factory.created[0].socket.emitOpen();
      factory.created[0].socket.emitRejected(401);
      expect(factory.created).toHaveLength(2);
      expect(factory.created[1].url).toBe("ws://field-b:5002");
      factory.created[1].socket.emitRejected(401);
      expect(connector.state()).toBe("backoff");
      expect(logger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          eventCode: "ws_register_rejected",
          category: "security",
        }),
      );
    });

    it("reddedilen soketin geç kapanma olayı durumu bozmaz", () => {
      void connector.start();
      factory.created[0].socket.emitOpen();
      factory.created[0].socket.emitRejected(401);
      const state = connector.state();
      factory.created[0].socket.emitClose();
      expect(connector.state()).toBe(state);
    });
  });

  describe("liveness (yarı-ölü bağlantı tespiti)", () => {
    beforeEach(() => {
      void connector.start();
      factory.created[0].socket.emitOpen();
      factory.created[0].socket.emitMessage(
        JSON.stringify({ type: "register-ack", status: "ok", serverTime: "now" }),
      );
    });

    it("60 sn pong yoksa bağlantı kapatılır + backoff", () => {
      vi.advanceTimersByTime(60000);
      expect(connector.state()).toBe("backoff");
      expect(factory.created[0].socket.closed).toBe(true);
    });

    it("pong gelirse bağlantı canlı kalır", () => {
      vi.advanceTimersByTime(30000);
      factory.created[0].socket.emitPong();
      vi.advanceTimersByTime(30000);
      expect(connector.state()).toBe("connected");
    });

    it("heartbeat gönderiminde ping atılır", () => {
      vi.advanceTimersByTime(15000);
      expect(factory.created[0].socket.client.ping).toHaveBeenCalled();
    });
  });

  describe("stop()", () => {
    it("connected iken stop → offline + soket kapanır + yeniden bağlanmaz", () => {
      void connector.start();
      factory.created[0].socket.emitOpen();
      factory.created[0].socket.emitMessage(
        JSON.stringify({ type: "register-ack", status: "ok", serverTime: "now" }),
      );
      void connector.stop();
      expect(connector.state()).toBe("offline");
      expect(factory.created[0].socket.closed).toBe(true);
      vi.advanceTimersByTime(60000);
      expect(factory.created).toHaveLength(1);
    });

    it("stop sonrası start tekrar bağlanır", () => {
      void connector.start();
      void connector.stop();
      void connector.start();
      expect(connector.state()).toBe("connecting");
      expect(factory.created).toHaveLength(2);
    });

    it("offline durumda stop no-op", () => {
      void connector.stop();
      expect(connector.state()).toBe("offline");
    });
  });

  describe("operational config (T2.5)", () => {
    beforeEach(() => {
      void connector.start();
      factory.created[0].socket.emitOpen();
    });

    it("register-ack.config aralıkları değiştirir (heartbeat 5 sn)", () => {
      factory.created[0].socket.emitMessage(
        JSON.stringify({
          type: "register-ack",
          status: "ok",
          serverTime: "now",
          config: { heartbeatIntervalMs: 5000 },
        }),
      );
      expect(connector.state()).toBe("connected");
      const before = factory.created[0].socket.sent.length;
      vi.advanceTimersByTime(5000);
      expect(factory.created[0].socket.sent.length).toBe(before + 1);
      vi.advanceTimersByTime(5000);
      expect(factory.created[0].socket.sent.length).toBe(before + 2);
    });

    it("config-update frame'i restart'sız aralık değiştirir", () => {
      factory.created[0].socket.emitMessage(
        JSON.stringify({ type: "register-ack", status: "ok", serverTime: "now" }),
      );
      factory.created[0].socket.emitMessage(
        JSON.stringify({
          type: "config-update",
          config: { heartbeatIntervalMs: 3000, telemetryIntervalMs: 20000 },
        }),
      );
      const before = factory.created[0].socket.sent.length;
      vi.advanceTimersByTime(3000);
      expect(factory.created[0].socket.sent.length).toBe(before + 1);
    });

    it("geçersiz config-update reddedilir — eski aralık korunur", () => {
      factory.created[0].socket.emitMessage(
        JSON.stringify({ type: "register-ack", status: "ok", serverTime: "now" }),
      );
      factory.created[0].socket.emitMessage(
        JSON.stringify({
          type: "config-update",
          config: { heartbeatIntervalMs: -5 },
        }),
      );
      expect(logger.log).toHaveBeenCalledWith(
        expect.objectContaining({ eventCode: "field_config_rejected" }),
      );
      const before = factory.created[0].socket.sent.length;
      vi.advanceTimersByTime(3000);
      expect(factory.created[0].socket.sent.length).toBe(before); // 15 sn döngüsü bozulmadı
    });

    it("geçersiz register-ack config'i de reddedilir ama bağlantı kurulur", () => {
      factory.created[0].socket.emitMessage(
        JSON.stringify({
          type: "register-ack",
          status: "ok",
          serverTime: "now",
          config: { telemetryIntervalMs: 100 },
        }),
      );
      expect(connector.state()).toBe("connected");
      expect(logger.log).toHaveBeenCalledWith(
        expect.objectContaining({ eventCode: "field_config_rejected" }),
      );
    });
  });

  describe("mesaj sağlamlığı", () => {
    it("malform JSON yok sayılır — çökme yok", () => {
      void connector.start();
      factory.created[0].socket.emitOpen();
      factory.created[0].socket.emitMessage("{not json");
      expect(connector.state()).toBe("connecting");
    });

    it("bilinmeyen mesaj tipi yok sayılır", () => {
      void connector.start();
      factory.created[0].socket.emitOpen();
      factory.created[0].socket.emitMessage(JSON.stringify({ type: "stream-open", streamId: 1 }));
      expect(connector.state()).toBe("connecting");
    });

    it("soket hatası loglanır (close olayı backoff'u yönetir)", () => {
      void connector.start();
      factory.created[0].socket.emitOpen();
      factory.created[0].socket.emitError(new Error("ECONNRESET"));
      expect(connector.state()).toBe("connecting");
    });

    it("error frame'i loglanır", () => {
      void connector.start();
      factory.created[0].socket.emitOpen();
      factory.created[0].socket.emitMessage(
        JSON.stringify({ type: "error", code: "protocol-error", message: "Bilinmeyen frame" }),
      );
      expect(logger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          eventCode: "ws_connection_lost",
          context: expect.objectContaining({ code: "protocol-error" }),
        }),
      );
    });

    it("kodsuz error frame'i 'unknown' ile loglanır", () => {
      void connector.start();
      factory.created[0].socket.emitOpen();
      factory.created[0].socket.emitMessage(JSON.stringify({ type: "error" }));
      expect(logger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          context: expect.objectContaining({ code: "unknown", message: "" }),
        }),
      );
    });

    it("register-ack status alanı yoksa 'unknown' ile reddedilir", () => {
      void connector.start();
      factory.created[0].socket.emitOpen();
      factory.created[0].socket.emitMessage(
        JSON.stringify({ type: "register-ack", serverTime: "now" }),
      );
      expect(connector.state()).toBe("backoff");
      expect(logger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          eventCode: "ws_register_rejected",
          context: expect.objectContaining({ status: "unknown" }),
        }),
      );
    });

    it("403 pre-upgrade de security logu üretir", () => {
      void connector.start();
      factory.created[0].socket.emitOpen();
      factory.created[0].socket.emitRejected(403);
      expect(logger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          eventCode: "ws_register_rejected",
          category: "security",
          context: expect.objectContaining({ statusCode: 403 }),
        }),
      );
    });
  });

  describe("bayat soket olayları (generation koruması)", () => {
    beforeEach(() => {
      void connector.start();
      factory.created[0].socket.emitOpen();
      factory.created[0].socket.emitRejected(401); // socket[1]'e geçildi
    });

    it("bayat soketin tüm olayları yok sayılır", () => {
      const stale = factory.created[0].socket;
      stale.emitOpen();
      stale.emitMessage(
        JSON.stringify({ type: "register-ack", status: "ok", serverTime: "now" }),
      );
      stale.emitClose();
      stale.emitError(new Error("late"));
      stale.emitPong();
      stale.emitRejected(401);
      expect(connector.state()).toBe("connecting");
      expect(factory.created).toHaveLength(2);
      // Bayat ack connected yapmamalı
      expect(connector.fieldConnected()).toBe(false);
    });

    it("bayat register timeout'u yeni bağlantıyı bozmaz", () => {
      vi.advanceTimersByTime(10000);
      expect(connector.state()).toBe("connecting");
      expect(factory.created).toHaveLength(2);
    });
  });

  describe("stop() yarışları", () => {
    it("stop sonrası geç kapanma olayı durumu bozmaz", () => {
      void connector.start();
      factory.created[0].socket.emitOpen();
      void connector.stop();
      factory.created[0].socket.emitClose();
      expect(connector.state()).toBe("offline");
      vi.advanceTimersByTime(60000);
      expect(factory.created).toHaveLength(1);
    });

    it("stop sonrası geç open register göndermez", () => {
      void connector.start();
      void connector.stop();
      factory.created[0].socket.emitOpen();
      expect(factory.created[0].socket.sent).toHaveLength(0);
      expect(connector.state()).toBe("offline");
    });

    it("stop sonrası rejected yeniden bağlanmaz (tek URL)", () => {
      const single = new FieldConnector(
        makeConfig({ wsUrls: ["ws://field-a:5002"] }),
        factory,
        { snapshot },
        new ReconnectDelay({ baseMs: 1000, maxMs: 60000, jitterSpanMs: 0, jitter: () => 0 }),
        logger.logger,
        clock,
      );
      void single.start();
      factory.created[0].socket.emitOpen();
      void single.stop();
      factory.created[0].socket.emitRejected(401);
      expect(single.state()).toBe("offline");
      vi.advanceTimersByTime(60000);
      expect(factory.created).toHaveLength(1);
    });

    it("stop sonrası rejected sıradaki URL'i denemez (çok URL)", () => {
      void connector.start();
      factory.created[0].socket.emitOpen();
      void connector.stop();
      factory.created[0].socket.emitRejected(401);
      expect(connector.state()).toBe("offline");
      expect(factory.created).toHaveLength(1);
    });
  });

  describe("snapshot yarışı ve hata biçimleri", () => {
    it("snapshot beklerken bağlantı koparsa telemetri gönderilmez", async () => {
      let resolveSnapshot!: (data: TunnelTelemetryPoint[]) => void;
      snapshot.mockImplementation(
        () => new Promise((resolve) => (resolveSnapshot = resolve)),
      );
      void connector.start();
      factory.created[0].socket.emitOpen();
      factory.created[0].socket.emitMessage(
        JSON.stringify({ type: "register-ack", status: "ok", serverTime: "now" }),
      );
      await vi.advanceTimersByTimeAsync(0);
      factory.created[0].socket.emitClose(); // backoff — snapshot hâlâ bekliyor
      resolveSnapshot(sampleTelemetry);
      await vi.advanceTimersByTimeAsync(0);
      const types = factory.created[0].socket.sent.map((s) => JSON.parse(s).type);
      expect(types).not.toContain("telemetry");
    });

    it("Error olmayan snapshot hatası da loglanır", async () => {
      snapshot.mockRejectedValue("redis down");
      void connector.start();
      factory.created[0].socket.emitOpen();
      factory.created[0].socket.emitMessage(
        JSON.stringify({ type: "register-ack", status: "ok", serverTime: "now" }),
      );
      await vi.advanceTimersByTimeAsync(0);
      expect(logger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          eventCode: "telemetry_push_failed",
          context: expect.objectContaining({ error: "redis down" }),
        }),
      );
    });
  });

  describe("logger'sız çalışma", () => {
    it("log çağrıları atlanır — çökme yok", () => {
      const bare = new FieldConnector(
        makeConfig(),
        factory,
        { snapshot },
        new ReconnectDelay({ baseMs: 1000, maxMs: 60000, jitterSpanMs: 0, jitter: () => 0 }),
        undefined,
        clock,
      );
      void bare.start();
      factory.created[0].socket.emitOpen();
      factory.created[0].socket.emitClose();
      expect(bare.state()).toBe("backoff");
    });
  });

  describe("tünel kanal kancaları (Faz 3)", () => {
    beforeEach(() => {
      void connector.start();
      factory.created[0].socket.emitOpen();
      factory.created[0].socket.emitMessage(
        JSON.stringify({ type: "register-ack", status: "ok", serverTime: "now" }),
      );
    });

    it("bilinmeyen kontrol mesajı abonelere iletilir", () => {
      const subscriber = vi.fn();
      connector.onMessage(subscriber);
      factory.created[0].socket.emitMessage(
        JSON.stringify({ type: "open-session", sessionId: "s-1" }),
      );
      expect(subscriber).toHaveBeenCalledWith(
        expect.objectContaining({ type: "open-session", sessionId: "s-1" }),
      );
    });

    it("unsubscribe sonrası iletilmez", () => {
      const subscriber = vi.fn();
      const unsubscribe = connector.onMessage(subscriber);
      unsubscribe();
      factory.created[0].socket.emitMessage(
        JSON.stringify({ type: "open-session", sessionId: "s-1" }),
      );
      expect(subscriber).not.toHaveBeenCalled();
    });

    it("sendControl JSON text frame gönderir", () => {
      connector.sendControl({ type: "open-session-ack", sessionId: "s-1" });
      const last = factory.created[0].socket.sent[factory.created[0].socket.sent.length - 1];
      expect(JSON.parse(last)).toMatchObject({
        type: "open-session-ack",
        sessionId: "s-1",
      });
    });

    it("sendBinary ham binary frame gönderir", () => {
      const frame = Buffer.from([1, 2, 3]);
      connector.sendBinary(frame);
      expect(factory.created[0].socket.binary).toHaveLength(1);
      expect(Buffer.from(factory.created[0].socket.binary[0])).toEqual(frame);
    });

    it("gelen binary frame abonelere iletilir", () => {
      const subscriber = vi.fn();
      connector.onBinaryFrame(subscriber);
      const frame = Buffer.from([9, 8, 7]);
      factory.created[0].socket.emitBinary(frame);
      expect(subscriber).toHaveBeenCalledWith(frame);
    });

    it("bağlı değilken sendControl/sendBinary no-op", () => {
      const fresh = makeFactory();
      const bare = new FieldConnector(
        makeConfig(),
        fresh,
        { snapshot },
        new ReconnectDelay({ baseMs: 1000, maxMs: 60000, jitterSpanMs: 0, jitter: () => 0 }),
        logger.logger,
        clock,
      );
      bare.sendControl({ type: "x" });
      bare.sendBinary(Buffer.from([1]));
      expect(fresh.created).toHaveLength(0);
    });
  });

  describe("constructor doğrulaması", () => {
    const mk = (overrides: Partial<ReturnType<typeof makeConfig>>) =>
      new FieldConnector(
        makeConfig(overrides),
        factory,
        { snapshot },
        new ReconnectDelay({ baseMs: 1000, maxMs: 60000, jitterSpanMs: 0, jitter: () => 0 }),
        logger.logger,
        clock,
      );

    it("boş URL listesi reddedilir", () => {
      expect(() => mk({ wsUrls: [] })).toThrow();
    });

    it("boş token reddedilir", () => {
      expect(() => mk({ token: "  " })).toThrow();
    });

    it("boş containerId reddedilir", () => {
      expect(() => mk({ containerId: "" })).toThrow();
    });

    it("pozitif olmayan aralıklar reddedilir", () => {
      expect(() => mk({ heartbeatIntervalMs: 0 })).toThrow();
      expect(() => mk({ telemetryIntervalMs: -1 })).toThrow();
    });
  });
});
