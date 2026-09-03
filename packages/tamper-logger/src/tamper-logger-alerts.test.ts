import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { TamperLogger } from "./tamper-logger";
import type { ILogSink } from "./interfaces";
import type { LogEvent } from "./types";

/**
 * TamperLogger alert kuralları (Faz 6 T6.7) sözleşmesi:
 * - alertRules.eventCodes ile eşleşen olaylar AlertNotifier'a iletilir
 *   (cooldown geçerlidir); eşleşmeyenler iletilmez.
 * - Alert hatası audit/security zincirini ETKİLEMEZ (fail-closed korunur).
 * - close() alert sink'lerini de kapatır.
 */

function makeSink(name = "sink"): ILogSink & { writes: LogEvent[][] } {
  const sink = {
    writes: [] as LogEvent[][],
    name: () => name,
    write: vi.fn(async (events: LogEvent[]) => {
      sink.writes.push(events);
    }),
    close: vi.fn(async () => {}),
  };
  return sink;
}

describe("TamperLogger — alertRules (T6.7)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-26T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("eşleşen eventCode cooldown'lu notifier'a iletilir", async () => {
    const alertSink = makeSink("alert");
    const logger = new TamperLogger({
      signingKey: "k",
      service: "web-service",
      sinks: [makeSink()],
      batchIntervalMs: 60000,
      alertRules: {
        sinks: [alertSink],
        eventCodes: ["login_locked", "device_alarm"],
        cooldownMs: 1000,
      },
    });
    await logger.log({
      level: "warn",
      category: "security",
      eventCode: "login_locked",
      message: "kilit",
    });
    await logger.close();
    expect(alertSink.writes).toHaveLength(1);
    expect(alertSink.writes[0][0].eventCode).toBe("login_locked");
  });

  it("eşleşmeyen eventCode iletilmez", async () => {
    const alertSink = makeSink("alert");
    const logger = new TamperLogger({
      signingKey: "k",
      service: "web-service",
      sinks: [makeSink()],
      alertRules: {
        sinks: [alertSink],
        eventCodes: ["login_locked"],
      },
    });
    await logger.log({
      level: "info",
      category: "app",
      eventCode: "service_started",
      message: "start",
    });
    await logger.close();
    expect(alertSink.writes).toHaveLength(0);
  });

  it("cooldown: aynı eventCode kısa sürede tek bildirim", async () => {
    const alertSink = makeSink("alert");
    const logger = new TamperLogger({
      signingKey: "k",
      service: "web-service",
      sinks: [makeSink()],
      alertRules: {
        sinks: [alertSink],
        eventCodes: ["login_locked"],
        cooldownMs: 60_000,
      },
    });
    await logger.log({
      level: "warn",
      category: "security",
      eventCode: "login_locked",
      message: "kilit-1",
    });
    await logger.log({
      level: "warn",
      category: "security",
      eventCode: "login_locked",
      message: "kilit-2",
    });
    await logger.close();
    expect(alertSink.writes).toHaveLength(1);
  });

  it("alert hatası audit fail-closed zincirini bozmaz", async () => {
    const alertSink = {
      name: () => "alert",
      write: vi.fn().mockRejectedValue(new Error("smtp down")),
      close: vi.fn().mockResolvedValue(undefined),
    };
    const logger = new TamperLogger({
      signingKey: "k",
      service: "web-service",
      sinks: [makeSink()],
      alertRules: {
        sinks: [alertSink],
        eventCodes: ["login_locked"],
      },
    });
    // audit olayı başarıyla işlenmeli (alert hatası fırlatılmaz)
    await expect(
      logger.log({
        level: "info",
        category: "audit",
        eventCode: "login_succeeded",
        message: "ok",
      }),
    ).resolves.toBeUndefined();
    await logger.close();
  });

  it("close alert sink'lerini kapatır", async () => {
    const alertSink = makeSink("alert");
    const logger = new TamperLogger({
      signingKey: "k",
      service: "web-service",
      sinks: [makeSink()],
      alertRules: { sinks: [alertSink], eventCodes: ["device_alarm"] },
    });
    await logger.close();
    expect(alertSink.close).toHaveBeenCalled();
  });
});
