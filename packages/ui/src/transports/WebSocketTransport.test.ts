import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { WebSocketTransport } from "./WebSocketTransport";
import type { TelemetryObserver } from "@gd-monorepo/shared-types";

/**
 * WebSocketTransport sözleşmesi (2026-08-30 — T2):
 * - connect: "connecting" → open'da "connected" + her deviceId için
 *   subscribe mesajı; token varsa query'ye eklenir.
 * - initial/telemetry mesajları onData; malform mesaj onError.
 * - Açılmadan kapanma → "error" + rejected hatası, reconnect YOK.
 * - Açıldıktan sonra kapanma/error → üstel backoff reconnect (tavan 30 sn).
 * - disconnect: cancelled — bir daha reconnect olmaz, state "idle".
 */

class FakeWebSocket {
  static instances: FakeWebSocket[] = [];
  static OPEN = 1;
  static CONNECTING = 0;

  readyState = 1;
  sent: string[] = [];
  url: string;
  onopen: (() => void) | null = null;
  onmessage: ((ev: MessageEvent) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(url: string) {
    this.url = url;
    FakeWebSocket.instances.push(this);
  }

  send(data: string) {
    this.sent.push(data);
  }

  close() {
    this.onclose?.();
  }

  emitOpen() {
    this.onopen?.();
  }

  emitMessage(data: unknown) {
    this.onmessage?.({ data: JSON.stringify(data) } as MessageEvent);
  }

  emitClose() {
    this.onclose?.();
  }

  emitError() {
    this.onerror?.();
  }
}

function makeObserver(): TelemetryObserver {
  return {
    onData: vi.fn(),
    onError: vi.fn(),
    onConnectionChange: vi.fn(),
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  FakeWebSocket.instances = [];
  vi.stubGlobal("WebSocket", FakeWebSocket as unknown as typeof WebSocket);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("WebSocketTransport (T2)", () => {
  it("connect → open: connected + deviceId başına subscribe mesajı", async () => {
    const transport = new WebSocketTransport("ws://x/ws/telemetry");
    const observer = makeObserver();
    transport.subscribe(observer);

    await transport.connect({ deviceId: "BSC-1,CB-1" });
    const ws = FakeWebSocket.instances[0]!;
    ws.emitOpen();

    expect(observer.onConnectionChange).toHaveBeenCalledWith("connected");
    expect(ws.sent).toEqual([
      JSON.stringify({ type: "subscribe", deviceId: "BSC-1" }),
      JSON.stringify({ type: "subscribe", deviceId: "CB-1" }),
    ]);
    await transport.disconnect();
  });

  it("token varsa query'ye eklenir", async () => {
    const transport = new WebSocketTransport(
      "ws://x/ws/telemetry",
      () => "tok-1",
    );
    await transport.connect({ deviceId: "BSC-1" });
    expect(FakeWebSocket.instances[0]?.url).toContain("token=tok-1");
    await transport.disconnect();
  });

  it("initial ve telemetry mesajları onData'yı besler", async () => {
    const transport = new WebSocketTransport("ws://x/ws/telemetry");
    const observer = makeObserver();
    transport.subscribe(observer);
    await transport.connect({ deviceId: "BSC-1" });
    const ws = FakeWebSocket.instances[0]!;
    ws.emitOpen();

    const batch = [
      { deviceId: "BSC-1", name: "SOC", value: 80, description: "", unit: "%", timestamp: "t" },
    ];
    ws.emitMessage({ type: "initial", data: batch });
    ws.emitMessage({ type: "telemetry", data: batch });

    expect(observer.onData).toHaveBeenCalledTimes(2);
    await transport.disconnect();
  });

  it("malform mesaj onError üretir (bağlantı kopmaz)", async () => {
    const transport = new WebSocketTransport("ws://x/ws/telemetry");
    const observer = makeObserver();
    transport.subscribe(observer);
    await transport.connect({ deviceId: "BSC-1" });
    const ws = FakeWebSocket.instances[0]!;
    ws.emitOpen();

    ws.onmessage?.({ data: "bu-json-degil" } as MessageEvent);
    expect(observer.onError).toHaveBeenCalledWith(expect.any(Error));
    await transport.disconnect();
  });

  it("açılmadan kapanma → error + rejected; reconnect YOK", async () => {
    const transport = new WebSocketTransport("ws://x/ws/telemetry");
    const observer = makeObserver();
    transport.subscribe(observer);
    await transport.connect({ deviceId: "BSC-1" });
    const ws = FakeWebSocket.instances[0]!;

    ws.emitClose();

    expect(observer.onConnectionChange).toHaveBeenCalledWith("error");
    expect(observer.onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: "WebSocket connection rejected" }),
    );
    vi.advanceTimersByTime(60_000);
    expect(FakeWebSocket.instances).toHaveLength(1);
    await transport.disconnect();
  });

  it("açıldıktan sonra kapanma → üstel backoff reconnect (tavan 30 sn)", async () => {
    const transport = new WebSocketTransport("ws://x/ws/telemetry");
    const observer = makeObserver();
    transport.subscribe(observer);
    await transport.connect({ deviceId: "BSC-1" });
    const first = FakeWebSocket.instances[0]!;
    first.emitOpen();

    first.emitClose();
    vi.advanceTimersByTime(2999);
    expect(FakeWebSocket.instances).toHaveLength(1);
    vi.advanceTimersByTime(2);
    expect(FakeWebSocket.instances).toHaveLength(2);
    await transport.disconnect();
  });

  it("disconnect: cancelled — kapanma sonrası reconnect OLMAZ, state idle", async () => {
    const transport = new WebSocketTransport("ws://x/ws/telemetry");
    const observer = makeObserver();
    transport.subscribe(observer);
    await transport.connect({ deviceId: "BSC-1" });
    const ws = FakeWebSocket.instances[0]!;
    ws.emitOpen();

    await transport.disconnect();
    expect(transport.connectionState()).toBe("idle");

    ws.emitClose();
    vi.advanceTimersByTime(60_000);
    expect(FakeWebSocket.instances).toHaveLength(1);
  });
});
