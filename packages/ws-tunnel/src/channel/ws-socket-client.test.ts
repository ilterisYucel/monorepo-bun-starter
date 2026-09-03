import { describe, it, expect, vi } from "vitest";
import type { WebSocket } from "ws";
import { WsSocketClient, WsSocketClientFactory } from "./ws-socket-client";
import type { ISocketClient } from "./interface";

/**
 * WsSocketClient + WsSocketClientFactory sözleşmesi:
 *
 * - WsSocketClient: `ws` paketini ISocketClient'a uyarlar (Adapter). Delegasyon
 *   birebirdir: send/ping/close → raw.*; olaylar 1:1 kablolanır; `unexpected-response`
 *   (pre-upgrade ret) → statusCode'a çevrilir (yoksa 0); readyState 4 duruma eşlenir.
 * - WsSocketClientFactory: creator enjekte edilir (testlerde fake); varsayılan
 *   creator gerçek `ws` WebSocket üretir (ELEGANT-EXCEPTION: varsayılan argüman
 *   AlertNotifier deseni — üretim kodu enjekte etmez).
 */
describe("WsSocketClient (T2.1c)", () => {
  function fakeRaw(readyState = 1) {
    const handlers = new Map<string, (...args: unknown[]) => void>();
    const raw = {
      send: vi.fn(),
      ping: vi.fn(),
      close: vi.fn(),
      readyState,
      on: vi.fn((event: string, cb: (...args: unknown[]) => void) => {
        handlers.set(event, cb);
      }),
    };
    return {
      raw,
      emit: (event: string, ...args: unknown[]) => handlers.get(event)?.(...args),
    };
  }
  it("send/ping/close raw'a delege edilir", () => {
    const { raw } = fakeRaw();
    const client = new WsSocketClient(raw as unknown as WebSocket);
    client.send("{}");
    client.ping();
    client.close();
    expect(raw.send).toHaveBeenCalledWith("{}");
    expect(raw.ping).toHaveBeenCalled();
    expect(raw.close).toHaveBeenCalled();
  });
  it("message olayı string'e çevrilir", () => {
    const { raw, emit } = fakeRaw();
    const client = new WsSocketClient(raw as unknown as WebSocket);
    const onMessage = vi.fn();
    client.onMessage(onMessage);
    emit("message", Buffer.from("{\"type\":\"heartbeat\"}"));
    expect(onMessage).toHaveBeenCalledWith("{\"type\":\"heartbeat\"}");
  });
  it("open/close/error/pong olayları birebir kablolanır", () => {
    const { raw, emit } = fakeRaw();
    const client = new WsSocketClient(raw as unknown as WebSocket);
    const onOpen = vi.fn();
    const onClose = vi.fn();
    const onError = vi.fn();
    const onPong = vi.fn();
    client.onOpen(onOpen);
    client.onClose(onClose);
    client.onError(onError);
    client.onPong(onPong);
    emit("open");
    emit("close");
    emit("error", new Error("x"));
    emit("pong");
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onPong).toHaveBeenCalledTimes(1);
  });
  it("unexpected-response → statusCode (yoksa 0)", () => {
    const { raw, emit } = fakeRaw();
    const client = new WsSocketClient(raw as unknown as WebSocket);
    const onRejected = vi.fn();
    client.onRejected(onRejected);
    emit("unexpected-response", {}, { statusCode: 401 });
    emit("unexpected-response", {}, {});
    expect(onRejected).toHaveBeenNthCalledWith(1, 401);
    expect(onRejected).toHaveBeenNthCalledWith(2, 0);
  });
  it.each([
    [0, "connecting"],
    [1, "open"],
    [2, "closing"],
    [3, "closed"],
  ] as const)("readyState %s → '%s'", (wsState, expected) => {
    const { raw } = fakeRaw(wsState);
    const client = new WsSocketClient(raw as unknown as WebSocket);
    expect(client.readyState()).toBe(expected);
  });
});
describe("WsSocketClientFactory (T2.1c)", () => {
  it("creator'ı url + headers ile çağırır ve sarar", () => {
    const raw = {
      send: vi.fn(),
      ping: vi.fn(),
      close: vi.fn(),
      readyState: 1,
      on: vi.fn(),
    };
    const creator = vi.fn().mockReturnValue(raw);
    const factory = new WsSocketClientFactory(
      creator as unknown as (url: string, options: { headers: Record<string, string> }) => WebSocket,
    );
    const client: ISocketClient = factory.create("ws://field", {
      Authorization: "Bearer tok",
    });
    expect(creator).toHaveBeenCalledWith("ws://field", {
      headers: { Authorization: "Bearer tok" },
    });
    client.send("x");
    expect(raw.send).toHaveBeenCalledWith("x");
  });
});
