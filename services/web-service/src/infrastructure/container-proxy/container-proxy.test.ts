import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { ContainerProxy } from "./container-proxy";
import { sha256Hex } from "../auth/service-token";
import type { ISqlDatabase } from "@gd-monorepo/core";
import { TamperLogger } from "@gd-monorepo/tamper-logger";


/**
 * container-proxy sözleşmesi (Faz 1 T1.1/T1.5):
 *
 * KARAKTERİZASYON (değişiklik öncesi, doğrulandı): register token'sızdı;
 * URL self-reported'dı; fetch token taşımıyordu. T1.1/T1.5 ile:
 * - register: token zorunlu, `sha256(token) == field_containers.token_hash`;
 *   eşleşmezse bağlantı KAPATILIR + `ws_register_rejected` security logu.
 * - sql yoksa fail-closed: register reddedilir.
 * - URL registry'den gelir; self-reported yok sayılır.
 * - historical()/health(): registry URL + `Authorization: Bearer <token>`.
 */

interface FakeWs {
  ws: unknown;
  state: { closed: boolean };
  emit: (event: string, ...args: unknown[]) => void;
  sent: string[];
}

function fakeWs(): FakeWs {
  const handlers = new Map<string, (...args: unknown[]) => void>();
  const state = { closed: false };
  const sent: string[] = [];
  const ws = {
    OPEN: 1,
    get readyState() {
      return state.closed ? 3 : 1;
    },
    send: vi.fn((frame: string) => {
      sent.push(frame);
    }),
    close: vi.fn(() => {
      state.closed = true;
    }),
    on: vi.fn((event: string, fn: (...args: unknown[]) => void) => {
      handlers.set(event, fn);
    }),
  };
  return {
    ws,
    state,
    sent,
    emit: (event, ...args) => {
      // gerçek ws'te close olayı readyState=CLOSED ile birlikte gelir
      if (event === "close") state.closed = true;
      handlers.get(event)?.(...args);
    },
  };
}

const TOKEN = "service-token-1234567890-abcdefghijklmnop";

function makeSql(overrides: Partial<ISqlDatabase> = {}): ISqlDatabase {
  return {
    connect: vi.fn(),
    disconnect: vi.fn(),
    execute: vi.fn().mockResolvedValue(undefined),
    query: vi.fn().mockResolvedValue([]),
    queryOne: vi.fn().mockImplementation((sql: string) => {
      if (sql.includes("SELECT 1 AS n")) {
        return Promise.resolve({ n: 1 });
      }
      return Promise.resolve({
        container_url: "http://registry-url:8080",
        token_hash: sha256Hex(TOKEN),
      });
    }),
    health: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
}

function mockLogger(): { logger: TamperLogger; log: ReturnType<typeof vi.fn> } {
  const log = vi.fn().mockResolvedValue(undefined);
  return { logger: { log } as unknown as TamperLogger, log };
}

function mockFetch(ok = true, data: unknown = []): ReturnType<typeof vi.fn> {
  return vi.fn().mockResolvedValue({
    ok,
    json: vi.fn().mockResolvedValue(data),
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("container-proxy T1.1 sözleşmesi (token doğrulama)", () => {
  it("geçerli token ile register — connected + registry URL", async () => {
    const proxy = new ContainerProxy(makeSql());
    await proxy.registerContainer("c-1", fakeWs().ws as never, TOKEN);
    expect(proxy.connectionStatus().get("c-1")).toBe("connected");
  });

  it("yanlış token ile register — bağlantı kapatılır, kayıt yok", async () => {
    const proxy = new ContainerProxy(makeSql());
    const fake = fakeWs();
    await proxy.registerContainer("c-1", fake.ws as never, "sahte-token-1234567890123456789012345678");
    expect(fake.state.closed).toBe(true);
    expect(proxy.containerIds()).toEqual([]);
  });

  it("token'sız register — bağlantı kapatılır", async () => {
    const proxy = new ContainerProxy(makeSql());
    const fake = fakeWs();
    await proxy.registerContainer("c-1", fake.ws as never);
    expect(fake.state.closed).toBe(true);
    expect(proxy.containerIds()).toEqual([]);
  });

  it("registry'de bilinmeyen containerId — kapatılır", async () => {
    const sql = makeSql({
      queryOne: vi.fn().mockResolvedValue(undefined),
    });
    const proxy = new ContainerProxy(sql);
    const fake = fakeWs();
    await proxy.registerContainer("c-x", fake.ws as never, TOKEN);
    expect(fake.state.closed).toBe(true);
  });

  it("sql yoksa fail-closed — register reddedilir", async () => {
    const proxy = new ContainerProxy();
    const fake = fakeWs();
    await proxy.registerContainer("c-1", fake.ws as never, TOKEN);
    expect(fake.state.closed).toBe(true);
  });

  it("reddedilen register ws_register_rejected security logu üretir", async () => {
    const { logger, log } = mockLogger();
    const proxy = new ContainerProxy(makeSql(), logger);
    await proxy.registerContainer("c-1", fakeWs().ws as never, "yanlis-token-12345678901234567890123456");
    expect(log).toHaveBeenCalledTimes(1);
    const input = log.mock.calls[0][0];
    expect(input.category).toBe("security");
    expect(input.eventCode).toBe("ws_register_rejected");
    expect(input.context.containerId).toBe("c-1");
  });

  it("authenticateContainerToken — registry'deki hash ile true", async () => {
    const proxy = new ContainerProxy(makeSql());
    expect(await proxy.authenticateContainerToken(TOKEN)).toBe(true);
  });

  it("authenticateContainerToken — bilinmeyen token false", async () => {
    const sql = makeSql({
      queryOne: vi.fn().mockResolvedValue(undefined),
    });
    const proxy = new ContainerProxy(sql);
    expect(await proxy.authenticateContainerToken("yok")).toBe(false);
  });
});

describe("container-proxy T1.5 sözleşmesi (registry URL + token'lı fetch)", () => {
  it("health() registry URL'ine token'lı fetch yapar", async () => {
    const fetchMock = mockFetch(true);
    vi.stubGlobal("fetch", fetchMock);

    const proxy = new ContainerProxy(makeSql());
    await proxy.registerContainer("c-1", fakeWs().ws as never, TOKEN);

    expect(await proxy.health("c-1")).toBe(true);
    const [url, options] = fetchMock.mock.calls[0] as [string, { headers?: Record<string, string> }];
    expect(url).toContain("http://registry-url:8080");
    expect(options?.headers?.Authorization).toBe(`Bearer ${TOKEN}`);
  });

  it("token RAM'de yoksa fetch headersız gider (restart sonrası kademeli)", async () => {
    const fetchMock = mockFetch(false);
    vi.stubGlobal("fetch", fetchMock);

    // RAM token'ı olmayan ama URL'li entry: kayıtsız senaryo simülasyonu
    const proxy = new ContainerProxy(makeSql());
    await proxy.registerContainer("c-1", fakeWs().ws as never, TOKEN);
    (proxy as unknown as { tokens: Map<string, string> }).tokens.delete("c-1");

    await proxy.health("c-1");
    const [, options] = fetchMock.mock.calls[0] as [string, { headers?: Record<string, string> }];
    expect(options?.headers?.Authorization).toBeUndefined();
  });
});

describe("container-proxy Faz 5.1 B2 sözleşmesi (telemetry-query kontrol frame'i)", () => {
  it("historical() WS'e telemetry-query frame'i gönderir ve telemetry-result ile çözülür", async () => {
    const proxy = new ContainerProxy(makeSql());
    const fake = fakeWs();
    await proxy.registerContainer("c-1", fake.ws as never, TOKEN);

    const resultPromise = proxy.historical("c-1", {
      from: new Date("2026-08-25T00:00:00Z"),
      to: new Date("2026-08-25T12:00:00Z"),
      points: 60,
    });

    const frame = JSON.parse(fake.sent[fake.sent.length - 1]);
    expect(frame).toMatchObject({
      type: "telemetry-query",
      queryId: expect.any(String) as string,
      from: "2026-08-25T00:00:00.000Z",
      to: "2026-08-25T12:00:00.000Z",
      points: 60,
    });

    fake.emit(
      "message",
      Buffer.from(
        JSON.stringify({
          type: "telemetry-result",
          queryId: frame.queryId,
          data: [{ name: "V", value: 1 }],
        }),
      ),
    );
    await expect(resultPromise).resolves.toEqual([{ name: "V", value: 1 }]);
  });

  it("telemetry-query-error → boş dizi (kademeli bozulma)", async () => {
    const proxy = new ContainerProxy(makeSql());
    const fake = fakeWs();
    await proxy.registerContainer("c-1", fake.ws as never, TOKEN);

    const resultPromise = proxy.historical("c-1", { points: 120 });
    const frame = JSON.parse(fake.sent[fake.sent.length - 1]);

    fake.emit(
      "message",
      Buffer.from(
        JSON.stringify({ type: "telemetry-query-error", queryId: frame.queryId, message: "x" }),
      ),
    );
    await expect(resultPromise).resolves.toEqual([]);
  });

  it("konteyner kayıtlı değilse veya WS kapalıysa frame gönderilmez — boş dizi", async () => {
    const proxy = new ContainerProxy(makeSql());
    expect(await proxy.historical("yok", { points: 120 })).toEqual([]);

    const fake = fakeWs();
    await proxy.registerContainer("c-1", fake.ws as never, TOKEN);
    fake.state.closed = true;
    const sentBefore = fake.sent.length;
    expect(await proxy.historical("c-1", { points: 120 })).toEqual([]);
    expect(fake.sent.length).toBe(sentBefore);
  });

  it("timeout aşılınca boş dizi döner (queryTimeoutMs enjekte edilir)", async () => {
    vi.useFakeTimers();
    try {
      const proxy = new ContainerProxy(makeSql(), undefined, { queryTimeoutMs: 5000 });
      const fake = fakeWs();
      await proxy.registerContainer("c-1", fake.ws as never, TOKEN);

      let resolved = false;
      const resultPromise = proxy.historical("c-1", { points: 120 }).then((v) => {
        resolved = true;
        return v;
      });
      await vi.advanceTimersByTimeAsync(4999);
      expect(resolved).toBe(false);
      await vi.advanceTimersByTimeAsync(1);
      await expect(resultPromise).resolves.toEqual([]);
    } finally {
      vi.useRealTimers();
    }
  });

  it("WS kapanınca bekleyen sorgular boş diziyle kapatılır", async () => {
    const proxy = new ContainerProxy(makeSql());
    const fake = fakeWs();
    await proxy.registerContainer("c-1", fake.ws as never, TOKEN);

    const resultPromise = proxy.historical("c-1", { points: 120 });
    fake.emit("close");
    await expect(resultPromise).resolves.toEqual([]);
  });

  it("ilgisiz mesajlar bekleyen sorguları etkilemez (observer'a düşer)", async () => {
    const proxy = new ContainerProxy(makeSql());
    const obs = { onControlMessage: vi.fn(), onData: vi.fn(), onConnectionChange: vi.fn() };
    proxy.addObserver(obs as never);
    const fake = fakeWs();
    await proxy.registerContainer("c-1", fake.ws as never, TOKEN);

    const resultPromise = proxy.historical("c-1", { points: 120 });
    const frame = JSON.parse(fake.sent[fake.sent.length - 1]);

    fake.emit("message", Buffer.from(JSON.stringify({ type: "stream-open-ack", streamId: 1 })));
    expect(obs.onControlMessage).toHaveBeenCalled();

    fake.emit(
      "message",
      Buffer.from(
        JSON.stringify({
          type: "telemetry-result",
          queryId: frame.queryId,
          data: [{ name: "V" }],
        }),
      ),
    );
    await expect(resultPromise).resolves.toEqual([{ name: "V" }]);
  });
});

describe("container-proxy karakterizasyon (değişmeyen davranışlar)", () => {
  it("observer'a connection değişimi bildirilir", async () => {
    const proxy = new ContainerProxy(makeSql());
    const obs = { onData: vi.fn(), onConnectionChange: vi.fn() };
    proxy.addObserver(obs);
    await proxy.registerContainer("c-1", fakeWs().ws as never, TOKEN);
    expect(obs.onConnectionChange).toHaveBeenCalledWith("c-1", "connected");
  });

  it("telemetry mesajı latest günceller + onData", async () => {
    const proxy = new ContainerProxy(makeSql());
    const obs = { onData: vi.fn(), onConnectionChange: vi.fn() };
    proxy.addObserver(obs);
    const fake = fakeWs();
    await proxy.registerContainer("c-1", fake.ws as never, TOKEN);

    const telemetries = [{ name: "V", value: 1, timestamp: "t", deviceId: "c-1" }];
    fake.emit("message", Buffer.from(JSON.stringify({ type: "telemetry", data: telemetries })));

    expect(proxy.latestTelemetry("c-1")).toEqual(telemetries);
    expect(obs.onData).toHaveBeenCalledWith("c-1", telemetries);
  });

  it("close → idle bildirimi", async () => {
    const proxy = new ContainerProxy(makeSql());
    const obs = { onData: vi.fn(), onConnectionChange: vi.fn() };
    proxy.addObserver(obs);
    const fake = fakeWs();
    await proxy.registerContainer("c-1", fake.ws as never, TOKEN);

    fake.emit("close");

    expect(proxy.connectionStatus().get("c-1")).toBe("idle");
    expect(obs.onConnectionChange).toHaveBeenCalledWith("c-1", "idle");
  });

  it("unregisterContainer siler", async () => {
    const proxy = new ContainerProxy(makeSql());
    await proxy.registerContainer("c-1", fakeWs().ws as never, TOKEN);
    proxy.unregisterContainer("c-1");
    expect(proxy.containerIds()).toEqual([]);
  });
});

/**
 * T2.4 — register-ack + heartbeat + lastSeenAt + stale sözleşmesi:
 * - Başarılı register `register-ack {status:"ok"}` gönderir (FieldConnector
 *   bunu bekler — onsuz konteyner asla "connected" olamaz).
 * - Reddedilen register `register-ack {status:"rejected"}` + kapatma.
 * - Heartbeat `lastSeenAt`'i tazeler; 45 sn sessizlik → "stale" (tam 45 sn'de,
 *   per-entry zamanlayıcı); stale → heartbeat → "connected".
 * - close sonrası kayıt + lastSeenAt korunur (idle — §12.4).
 */
describe("container-proxy T2.4 sözleşmesi (heartbeat + stale)", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date(0) });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("başarılı register register-ack ok gönderir", async () => {
    const proxy = new ContainerProxy(makeSql());
    const fake = fakeWs();
    await proxy.registerContainer("c-1", fake.ws as never, TOKEN);
    expect(fake.sent).toHaveLength(1);
    const ack = JSON.parse(fake.sent[0]);
    expect(ack.type).toBe("register-ack");
    expect(ack.status).toBe("ok");
    expect(ack.serverTime).toBeDefined();
  });

  it("reddedilen register register-ack rejected + kapatma", async () => {
    const proxy = new ContainerProxy(makeSql());
    const fake = fakeWs();
    await proxy.registerContainer("c-1", fake.ws as never, "sahte-token-1234567890123456789012345678");
    expect(fake.state.closed).toBe(true);
    expect(JSON.parse(fake.sent[0])).toMatchObject({
      type: "register-ack",
      status: "rejected",
    });
  });

  it("register lastSeenAt'i şimdiye kurar", async () => {
    const proxy = new ContainerProxy(makeSql());
    await proxy.registerContainer("c-1", fakeWs().ws as never, TOKEN);
    expect(proxy.lastSeenAt("c-1")).toBe(0);
  });

  it("heartbeat lastSeenAt'i tazeler", async () => {
    const proxy = new ContainerProxy(makeSql());
    const fake = fakeWs();
    await proxy.registerContainer("c-1", fake.ws as never, TOKEN);
    vi.advanceTimersByTime(30000);
    fake.emit("message", Buffer.from(JSON.stringify({ type: "heartbeat", ts: 30000 })));
    expect(proxy.lastSeenAt("c-1")).toBe(30000);
    expect(proxy.connectionStatus().get("c-1")).toBe("connected");
  });

  it("45 sn sessizlik → stale (observer bildirimi dahil)", async () => {
    const proxy = new ContainerProxy(makeSql());
    const obs = { onData: vi.fn(), onConnectionChange: vi.fn() };
    proxy.addObserver(obs);
    const fake = fakeWs();
    await proxy.registerContainer("c-1", fake.ws as never, TOKEN);
    // kalp atışları: t=0 (register), 15, 30 — son atıştan 45 sn = t=75
    vi.advanceTimersByTime(15000);
    fake.emit("message", Buffer.from(JSON.stringify({ type: "heartbeat", ts: 15000 })));
    vi.advanceTimersByTime(15000);
    fake.emit("message", Buffer.from(JSON.stringify({ type: "heartbeat", ts: 30000 })));
    expect(proxy.connectionStatus().get("c-1")).toBe("connected");
    vi.advanceTimersByTime(45000);
    expect(proxy.connectionStatus().get("c-1")).toBe("stale");
    expect(obs.onConnectionChange).toHaveBeenCalledWith("c-1", "stale");
  });

  it("stale → heartbeat → connected geri döner", async () => {
    const proxy = new ContainerProxy(makeSql());
    const obs = { onData: vi.fn(), onConnectionChange: vi.fn() };
    proxy.addObserver(obs);
    const fake = fakeWs();
    await proxy.registerContainer("c-1", fake.ws as never, TOKEN);
    vi.advanceTimersByTime(45000);
    expect(proxy.connectionStatus().get("c-1")).toBe("stale");
    vi.advanceTimersByTime(1000);
    fake.emit("message", Buffer.from(JSON.stringify({ type: "heartbeat", ts: 46000 })));
    expect(proxy.connectionStatus().get("c-1")).toBe("connected");
    expect(obs.onConnectionChange).toHaveBeenCalledWith("c-1", "connected");
  });

  it("close sonrası kayıt + lastSeenAt korunur (idle — §12.4)", async () => {
    const proxy = new ContainerProxy(makeSql());
    const fake = fakeWs();
    await proxy.registerContainer("c-1", fake.ws as never, TOKEN);
    vi.advanceTimersByTime(10000);
    fake.emit("message", Buffer.from(JSON.stringify({ type: "heartbeat", ts: 10000 })));
    fake.emit("close");
    expect(proxy.connectionStatus().get("c-1")).toBe("idle");
    expect(proxy.lastSeenAt("c-1")).toBe(10000);
  });

  it("kayıtsız container lastSeenAt undefined", () => {
    const proxy = new ContainerProxy(makeSql());
    expect(proxy.lastSeenAt("yok")).toBeUndefined();
  });

  it("stale eşiği config ile değiştirilebilir", async () => {
    const proxy = new ContainerProxy(makeSql(), undefined, { staleTimeoutMs: 10000 });
    await proxy.registerContainer("c-1", fakeWs().ws as never, TOKEN);
    vi.advanceTimersByTime(10000);
    expect(proxy.connectionStatus().get("c-1")).toBe("stale");
  });

  it("kapalıysa pushConfigUpdate frame göndermez", async () => {
    const proxy = new ContainerProxy(makeSql());
    const fake = fakeWs();
    await proxy.registerContainer("c-1", fake.ws as never, TOKEN);
    fake.emit("close");
    proxy.pushConfigUpdate("c-1", { heartbeatIntervalMs: 5000 });
    expect(fake.sent).toHaveLength(1); // yalnızca register-ack
  });

  it("pushConfigUpdate config-update frame'i gönderir", async () => {
    const proxy = new ContainerProxy(makeSql());
    const fake = fakeWs();
    await proxy.registerContainer("c-1", fake.ws as never, TOKEN);
    proxy.pushConfigUpdate("c-1", { heartbeatIntervalMs: 5000 });
    expect(JSON.parse(fake.sent[1])).toEqual({
      type: "config-update",
      config: { heartbeatIntervalMs: 5000 },
    });
  });

  it("operationalConfig register-ack'e gömülür", async () => {
    const proxy = new ContainerProxy(makeSql(), undefined, {
      operationalConfig: { telemetryIntervalMs: 20000 },
    });
    const fake = fakeWs();
    await proxy.registerContainer("c-1", fake.ws as never, TOKEN);
    const ack = JSON.parse(fake.sent[0]);
    expect(ack.config).toEqual({ telemetryIntervalMs: 20000 });
  });
});

describe("container-proxy kapsama (T2.4 ek — hata yolları)", () => {
  it("sql'siz authenticateContainerToken false", async () => {
    const proxy = new ContainerProxy();
    expect(await proxy.authenticateContainerToken(TOKEN)).toBe(false);
  });

  it("sql hatasında authenticateContainerToken false (fail-closed)", async () => {
    const sql = makeSql({
      queryOne: vi.fn().mockRejectedValue(new Error("db down")),
    });
    const proxy = new ContainerProxy(sql);
    expect(await proxy.authenticateContainerToken(TOKEN)).toBe(false);
  });

  it("registry sorgusu hata verirse register reddedilir", async () => {
    const sql = makeSql({
      queryOne: vi.fn().mockRejectedValue(new Error("db down")),
    });
    const proxy = new ContainerProxy(sql);
    const fake = fakeWs();
    await proxy.registerContainer("c-1", fake.ws as never, TOKEN);
    expect(fake.state.closed).toBe(true);
  });

  it("yeniden register eski bağlantıyı kapatır", async () => {
    const proxy = new ContainerProxy(makeSql());
    const first = fakeWs();
    await proxy.registerContainer("c-1", first.ws as never, TOKEN);
    const second = fakeWs();
    await proxy.registerContainer("c-1", second.ws as never, TOKEN);
    expect(first.state.closed).toBe(true);
    expect(proxy.connectionStatus().get("c-1")).toBe("connected");
  });

  it("registry'de container_url yoksa health false; historical frame'le yine çalışır", async () => {
    const sql = makeSql({
      queryOne: vi.fn().mockResolvedValue({
        container_url: null,
        token_hash: sha256Hex(TOKEN),
      }),
    });
    const proxy = new ContainerProxy(sql);
    const fake = fakeWs();
    await proxy.registerContainer("c-1", fake.ws as never, TOKEN);
    expect(await proxy.health("c-1")).toBe(false);

    const resultPromise = proxy.historical("c-1", { from: new Date(), to: new Date() });
    const frame = JSON.parse(fake.sent[fake.sent.length - 1]);
    fake.emit(
      "message",
      Buffer.from(
        JSON.stringify({ type: "telemetry-result", queryId: frame.queryId, data: [{ name: "V" }] }),
      ),
    );
    await expect(resultPromise).resolves.toEqual([{ name: "V" }]);
  });

  it("malform JSON mesajı yok sayılır", async () => {
    const proxy = new ContainerProxy(makeSql());
    const fake = fakeWs();
    await proxy.registerContainer("c-1", fake.ws as never, TOKEN);
    expect(() => fake.emit("message", Buffer.from("{not json"))).not.toThrow();
    expect(proxy.connectionStatus().get("c-1")).toBe("connected");
  });

  it("kayıtsız container latestTelemetry boş döner", () => {
    const proxy = new ContainerProxy(makeSql());
    expect(proxy.latestTelemetry("yok")).toEqual([]);
  });

  it("historical() from/to/points frame'e taşınır", async () => {
    const proxy = new ContainerProxy(makeSql());
    const fake = fakeWs();
    await proxy.registerContainer("c-1", fake.ws as never, TOKEN);
    void proxy.historical("c-1", { from: new Date(0), to: new Date(1), points: 60 });
    const frame = JSON.parse(fake.sent[fake.sent.length - 1]);
    expect(frame).toMatchObject({
      type: "telemetry-query",
      from: "1970-01-01T00:00:00.000Z",
      to: "1970-01-01T00:00:00.001Z",
      points: 60,
    });
  });

  it("historical() gönderim hatası → boş dizi", async () => {
    const proxy = new ContainerProxy(makeSql());
    const fake = fakeWs();
    await proxy.registerContainer("c-1", fake.ws as never, TOKEN);
    (fake.ws as { send: unknown }).send = vi.fn(() => {
      throw new Error("net");
    });
    expect(await proxy.historical("c-1", { from: new Date(), to: new Date() })).toEqual([]);
  });

  it("allHistorical çoklu konteyner", async () => {
    const proxy = new ContainerProxy(makeSql(), undefined, { queryTimeoutMs: 20 });
    await proxy.registerContainer("c-1", fakeWs().ws as never, TOKEN);
    const result = await proxy.allHistorical(["c-1", "yok"], { from: new Date(), to: new Date() });
    expect(result["c-1"]).toEqual([]);
    expect(result["yok"]).toEqual([]);
  });

  it("health() fetch hatası → false", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("net")));
    const proxy = new ContainerProxy(makeSql());
    await proxy.registerContainer("c-1", fakeWs().ws as never, TOKEN);
    expect(await proxy.health("c-1")).toBe(false);
  });

  it("start/stop + sweep (kapalı soket → idle)", async () => {
    vi.useFakeTimers();
    const proxy = new ContainerProxy(makeSql(), undefined, { sweepIntervalMs: 1000 });
    const fake = fakeWs();
    await proxy.registerContainer("c-1", fake.ws as never, TOKEN);
    await proxy.start();
    fake.emit("close");
    expect(proxy.connectionStatus().get("c-1")).toBe("idle");
    await proxy.stop();
    vi.useRealTimers();
  });

  it("removeObserver bildirimi durdurur", async () => {
    const proxy = new ContainerProxy(makeSql());
    const obs = { onData: vi.fn(), onConnectionChange: vi.fn() };
    proxy.addObserver(obs);
    proxy.removeObserver(obs);
    await proxy.registerContainer("c-1", fakeWs().ws as never, TOKEN);
    expect(obs.onConnectionChange).not.toHaveBeenCalled();
  });

  it("register-ack gönderiminde soket zaten kapalıysa gönderilmez", async () => {
    const proxy = new ContainerProxy(makeSql());
    const fake = fakeWs();
    (fake.ws as { close: ReturnType<typeof vi.fn> }).close();
    await proxy.registerContainer("c-1", fake.ws as never, TOKEN);
    expect(fake.sent).toHaveLength(0);
  });

  it("unregister sonrası heartbeat yok sayılır", async () => {
    const proxy = new ContainerProxy(makeSql());
    const fake = fakeWs();
    await proxy.registerContainer("c-1", fake.ws as never, TOKEN);
    proxy.unregisterContainer("c-1");
    expect(() =>
      fake.emit("message", Buffer.from(JSON.stringify({ type: "heartbeat", ts: 1 }))),
    ).not.toThrow();
  });

  it("security logu yazılamazsa da register reddedilir (fail-closed)", async () => {
    const log = vi.fn().mockRejectedValue(new Error("sink down"));
    const proxy = new ContainerProxy(
      makeSql(),
      { log } as unknown as TamperLogger,
    );
    const fake = fakeWs();
    await proxy.registerContainer("c-1", fake.ws as never, "sahte-token-1234567890123456789012345678");
    expect(fake.state.closed).toBe(true);
  });
});

describe("container-proxy Faz 3 kanalı (control + binary)", () => {
  it("bilinmeyen kontrol mesajı observer'a iletilir", async () => {
    const proxy = new ContainerProxy(makeSql());
    const obs = {
      onData: vi.fn(),
      onConnectionChange: vi.fn(),
      onControlMessage: vi.fn(),
    };
    proxy.addObserver(obs);
    const fake = fakeWs();
    await proxy.registerContainer("c-1", fake.ws as never, TOKEN);
    fake.emit("message", Buffer.from(JSON.stringify({ type: "open-session-ack", sessionId: "s-1" })));
    expect(obs.onControlMessage).toHaveBeenCalledWith(
      "c-1",
      expect.objectContaining({ type: "open-session-ack", sessionId: "s-1" }),
    );
  });

  it("binary frame observer'a iletilir (text parse edilmez)", async () => {
    const proxy = new ContainerProxy(makeSql());
    const obs = {
      onData: vi.fn(),
      onConnectionChange: vi.fn(),
      onBinaryFrame: vi.fn(),
    };
    proxy.addObserver(obs);
    const fake = fakeWs();
    await proxy.registerContainer("c-1", fake.ws as never, TOKEN);
    const frame = Buffer.from([0, 0, 0, 7, 0, 0, 0, 0, 0x01, 0xaa]);
    fake.emit("message", frame, true);
    expect(obs.onBinaryFrame).toHaveBeenCalledWith("c-1", frame);
  });

  it("sendControl açık WS'e JSON gönderir; kapalıysa no-op", async () => {
    const proxy = new ContainerProxy(makeSql());
    const fake = fakeWs();
    await proxy.registerContainer("c-1", fake.ws as never, TOKEN);
    proxy.sendControl("c-1", { type: "open-session", sessionId: "s-1" });
    expect(JSON.parse(fake.sent[fake.sent.length - 1])).toMatchObject({
      type: "open-session",
      sessionId: "s-1",
    });
    fake.emit("close");
    const before = fake.sent.length;
    proxy.sendControl("c-1", { type: "open-session", sessionId: "s-2" });
    expect(fake.sent).toHaveLength(before);
  });

  it("sendBinary açık WS'e ham frame gönderir; kapalıysa no-op", async () => {
    const proxy = new ContainerProxy(makeSql());
    const fake = fakeWs();
    await proxy.registerContainer("c-1", fake.ws as never, TOKEN);
    const frame = Buffer.from([1, 2, 3]);
    proxy.sendBinary("c-1", frame);
    expect(Buffer.from(fake.sent[fake.sent.length - 1])).toEqual(frame);
    fake.emit("close");
    const before = fake.sent.length;
    proxy.sendBinary("c-1", Buffer.from([9]));
    expect(fake.sent).toHaveLength(before);
  });
});
