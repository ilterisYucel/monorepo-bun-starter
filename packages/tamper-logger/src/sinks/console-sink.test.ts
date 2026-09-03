import { describe, it, expect, vi, afterEach } from "vitest";
import { ConsoleSink } from "./console-sink";
import type { LogEvent } from "../types";

/**
 * T0.4 — ConsoleSink kontratı:
 * - `name()` — "console".
 * - `write(events)` — her olayı seviye eşlemeli console metoduna JSON satırı
 *   olarak yazar (debug→debug, info→info, warn→warn, error/fatal→error).
 * - `close()` — hiçbir şey kapatmaz (no-op), hata fırlatmaz.
 */

function event(level: LogEvent["level"]): LogEvent {
  return {
    ts: "2026-08-24T10:00:00.000Z",
    level,
    category: "app",
    eventCode: "service_started",
    message: "test",
    context: {},
    correlationId: "c",
    service: "svc",
    host: "h",
    seq: 1,
    prevHash: "0".repeat(64),
    signature: "a".repeat(64),
  };
}

const spies: Array<[keyof Console, ReturnType<typeof vi.spyOn>]> = [];

function spyConsole() {
  spies.push(
    ["debug", vi.spyOn(console, "debug").mockImplementation(() => {})],
    ["info", vi.spyOn(console, "info").mockImplementation(() => {})],
    ["warn", vi.spyOn(console, "warn").mockImplementation(() => {})],
    ["error", vi.spyOn(console, "error").mockImplementation(() => {})],
  );
}

afterEach(() => {
  for (const [, spy] of spies) spy.mockRestore();
  spies.length = 0;
});

describe("ConsoleSink (T0.4)", () => {
  it("name() 'console' döner", () => {
    expect(new ConsoleSink().name()).toBe("console");
  });

  it("seviyeleri doğru console metoduna eşler", async () => {
    spyConsole();
    const sink = new ConsoleSink();
    await sink.write([
      event("debug"),
      event("info"),
      event("warn"),
      event("error"),
      event("fatal"),
    ]);
    expect(console.debug).toHaveBeenCalledTimes(1);
    expect(console.info).toHaveBeenCalledTimes(1);
    expect(console.warn).toHaveBeenCalledTimes(1);
    expect(console.error).toHaveBeenCalledTimes(2);
  });

  it("JSON satırı olarak yazar (tamper alanlarıyla)", async () => {
    spyConsole();
    const sink = new ConsoleSink();
    await sink.write([event("info")]);
    const line = (console.info as unknown as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as string;
    const parsed = JSON.parse(line) as LogEvent;
    expect(parsed.seq).toBe(1);
    expect(parsed.signature).toBe("a".repeat(64));
  });

  it("close() hata fırlatmaz", async () => {
    await expect(new ConsoleSink().close()).resolves.toBeUndefined();
  });
});
