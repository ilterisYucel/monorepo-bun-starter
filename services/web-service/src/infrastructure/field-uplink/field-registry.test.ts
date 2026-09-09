import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { WebSocket } from "ws";
import type { ISqlDatabase } from "@gd-monorepo/core";
import { FieldRegistry } from "./field-registry";
import { sha256Hex } from "../auth/service-token";

/**
 * FieldRegistry sözleşmesi (Faz 3 — boss tier field uplink kayıt defteri):
 * - Token hash doğrulaması fail-closed (register + pre-upgrade)
 * - register-ack ok/rejected; heartbeat → lastSeenAt; 45 sn sessizlik → stale
 * - Kontrol/binary frame'ler gözlemcilere akar (SessionGateway/TunnelProxy kanalı)
 */

function makeSql(): ISqlDatabase {
  return {
    execute: vi.fn().mockResolvedValue(undefined),
    query: vi.fn().mockResolvedValue([]),
    queryOne: vi.fn().mockResolvedValue(undefined),
    health: vi.fn().mockResolvedValue(true),
    disconnect: vi.fn().mockResolvedValue(undefined),
  } as unknown as ISqlDatabase;
}

function makeWs() {
  const sent: unknown[] = [];
  const listeners: Record<string, Array<(arg?: unknown) => void>> = {};
  const ws = {
    readyState: WebSocket.OPEN,
    OPEN: WebSocket.OPEN,
    send: vi.fn((data: unknown) => sent.push(data)),
    close: vi.fn(),
    terminate: vi.fn(),
    on: vi.fn((event: string, cb: (arg?: unknown, isBinary?: boolean) => void) => {
      (listeners[event] ??= []).push(cb as (arg?: unknown) => void);
      return ws;
    }),
    emit: (event: string, arg?: unknown, isBinary?: boolean) => {
      listeners[event]?.forEach((cb) => cb(arg, isBinary));
    },
  } as unknown as WebSocket & { emit(event: string, arg?: unknown, isBinary?: boolean): void };
  return { ws, sent };
}

const TOKEN = "field-token-1234567890abcdef";

describe("FieldRegistry (Faz 3)", () => {
  let sql: ReturnType<typeof makeSql>;
  let registry: FieldRegistry;

  beforeEach(() => {
    vi.useFakeTimers();
    sql = makeSql();
    registry = new FieldRegistry(sql, { now: () => Date.now() });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("token hash'i kaydeder (düz metin SQL'e girmez)", async () => {
    await registry.upsertToken("f-1", TOKEN);
    const call = (sql.execute as ReturnType<typeof vi.fn>).mock.calls[0] as [string, unknown[]];
    expect(call[1][1]).toBe(sha256Hex(TOKEN));
    expect(call[1][1]).not.toBe(TOKEN);
  });

  it("bilinmeyen token → authenticate false (fail-closed)", async () => {
    (sql.queryOne as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    expect(await registry.authenticateToken(TOKEN)).toBe(false);
  });

  it("register: token eşleşmezse rejected ack + kapanış", async () => {
    (sql.queryOne as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    const { ws, sent } = makeWs();
    await registry.register("f-1", ws, "yanlis-token");
    expect(JSON.parse(sent[0] as string).status).toBe("rejected");
    expect(ws.close).toHaveBeenCalled();
  });

  it("register: token eşleşirse ok ack + connected", async () => {
    (sql.queryOne as ReturnType<typeof vi.fn>).mockResolvedValue({ n: 1 });
    const observer = { onConnectionChange: vi.fn(), onControlMessage: vi.fn(), onBinaryFrame: vi.fn() };
    registry.addObserver(observer);
    const { ws, sent } = makeWs();
    await registry.register("f-1", ws, TOKEN);
    expect(JSON.parse(sent[0] as string).status).toBe("ok");
    expect(registry.isConnected("f-1")).toBe(true);
    expect(observer.onConnectionChange).toHaveBeenCalledWith("f-1", "connected");
  });

  it("heartbeat lastSeenAt'i tazeler; 45 sn sessizlik → stale", async () => {
    (sql.queryOne as ReturnType<typeof vi.fn>).mockResolvedValue({ n: 1 });
    const observer = { onConnectionChange: vi.fn() };
    registry.addObserver(observer);
    const { ws } = makeWs();
    await registry.register("f-1", ws, TOKEN);
    registry.attachSocketHandlers("f-1", ws);

    const registeredAt = registry.lastSeenAt("f-1");
    expect(registeredAt).toBe(Date.now());

    vi.advanceTimersByTime(5_000);
    ws.emit("message", JSON.stringify({ type: "heartbeat", ts: 1 }));
    expect(registry.lastSeenAt("f-1")).toBeGreaterThan(registeredAt ?? 0);

    vi.advanceTimersByTime(46_000);
    expect(registry.connectionStatus().get("f-1")).toBe("stale");
  });

  it("binary frame ve kontrol mesajı gözlemcilere akar", async () => {
    (sql.queryOne as ReturnType<typeof vi.fn>).mockResolvedValue({ n: 1 });
    const observer = { onControlMessage: vi.fn(), onBinaryFrame: vi.fn() };
    registry.addObserver(observer);
    const { ws } = makeWs();
    await registry.register("f-1", ws, TOKEN);
    registry.attachSocketHandlers("f-1", ws);

    ws.emit("message", JSON.stringify({ type: "stream-open-ack", streamId: 1 }));
    ws.emit("message", Buffer.from([0, 1, 2]), true);
    expect(observer.onControlMessage).toHaveBeenCalledWith(
      "f-1",
      expect.objectContaining({ type: "stream-open-ack" }),
    );
    expect(observer.onBinaryFrame).toHaveBeenCalledWith("f-1", expect.any(Buffer));
  });

  it("WS kapanırsa idle (kayıt düşer)", async () => {
    (sql.queryOne as ReturnType<typeof vi.fn>).mockResolvedValue({ n: 1 });
    const observer = { onConnectionChange: vi.fn() };
    registry.addObserver(observer);
    const { ws } = makeWs();
    await registry.register("f-1", ws, TOKEN);
    registry.attachSocketHandlers("f-1", ws);
    ws.emit("close");
    expect(registry.isConnected("f-1")).toBe(false);
    expect(observer.onConnectionChange).toHaveBeenCalledWith("f-1", "idle");
  });
});
