import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import {
  ClientLogger,
  installGlobalErrorHandlers,
} from "./client-logger";
import type { IClientLogTransport, ClientLogEvent } from "./client-logger";

/**
 * T0.8 — ClientLogger kontratı (TESTING.md §8.1; tasarım Faz 0 T0.8):
 *
 * - Batch: `log()` olayları tamponlar; batchSize dolunca veya interval
 *   geçince TEK `transport.send()` çağrısı yapılır (rate-limit dostu).
 * - Retry: send başarısızsa batch retry kuyruğuna döner; maxRetries aşılınca
 *   drop + sayaç (offline drop).
 * - `droppedEvents()` / `pending()` sorguları; `close()` timer'ı durdurur,
 *   kalan batch'i flush eder.
 * - `installGlobalErrorHandlers`: window.onerror + unhandledrejection →
 *   logger'a error event; temizleme fonksiyonu döner.
 */

class RecordingTransport implements IClientLogTransport {
  sends: ClientLogEvent[][] = [];
  failTimes = 0;

  async send(events: ClientLogEvent[]): Promise<void> {
    if (this.failTimes > 0) {
      this.failTimes--;
      throw new Error("network down");
    }
    this.sends.push(events);
  }
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

function event(message = "x"): ClientLogEvent {
  return { type: "error", source: "user", message };
}

describe("ClientLogger (T0.8)", () => {
  it("batchSize dolunca tek send ile flush eder", async () => {
    const transport = new RecordingTransport();
    const logger = new ClientLogger({ transport, batchSize: 3, batchIntervalMs: 60_000 });
    logger.log(event("a"));
    logger.log(event("b"));
    expect(transport.sends).toHaveLength(0);
    logger.log(event("c"));
    await logger.flush();
    expect(transport.sends).toHaveLength(1);
    expect(transport.sends[0]).toHaveLength(3);
  });

  it("interval geçince flush eder", async () => {
    const transport = new RecordingTransport();
    const logger = new ClientLogger({ transport, batchSize: 10, batchIntervalMs: 5000 });
    logger.log(event());
    await vi.advanceTimersByTimeAsync(5000);
    expect(transport.sends).toHaveLength(1);
    logger.close();
  });

  it("send başarısızsa retry eder — aynı olaylar tekrar gönderilir", async () => {
    const transport = new RecordingTransport();
    transport.failTimes = 1;
    const logger = new ClientLogger({ transport, batchSize: 10, batchIntervalMs: 60_000, maxRetries: 3 });
    logger.log(event("retry-me"));
    await logger.flush(); // 1. deneme başarısız → retry kuyruğu
    expect(transport.sends).toHaveLength(0);
    await logger.flush(); // 2. deneme başarılı
    expect(transport.sends).toHaveLength(1);
    expect(transport.sends[0][0].message).toBe("retry-me");
  });

  it("maxRetries aşılınca drop + sayaç", async () => {
    const transport = new RecordingTransport();
    transport.failTimes = 99;
    const logger = new ClientLogger({ transport, batchSize: 10, batchIntervalMs: 60_000, maxRetries: 2 });
    logger.log(event("lost"));
    await logger.flush(); // deneme 1
    await logger.flush(); // deneme 2
    await logger.flush(); // deneme 3 → maxRetries aşıldı → drop
    expect(logger.droppedEvents()).toBeGreaterThan(0);
    expect(transport.sends).toHaveLength(0);
  });

  it("pending() bekleyen olay sayısını döner", async () => {
    const transport = new RecordingTransport();
    const logger = new ClientLogger({ transport, batchSize: 10, batchIntervalMs: 60_000 });
    logger.log(event());
    logger.log(event());
    expect(logger.pending()).toBe(2);
    logger.close();
  });

  it("close() kalan batch'i flush eder ve timer durur", async () => {
    const transport = new RecordingTransport();
    const logger = new ClientLogger({ transport, batchSize: 10, batchIntervalMs: 5000 });
    logger.log(event());
    logger.close();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(transport.sends).toHaveLength(1);
  });

  it("boş transport kabul edilmez", () => {
    expect(
      () => new ClientLogger({ transport: undefined as unknown as IClientLogTransport }),
    ).toThrow();
  });
});

describe("installGlobalErrorHandlers (T0.8)", () => {
  it("window.onerror olayını logger'a iletir", () => {
    const transport = new RecordingTransport();
    const logger = new ClientLogger({ transport, batchSize: 10, batchIntervalMs: 60_000 });
    const cleanup = installGlobalErrorHandlers(logger);

    window.dispatchEvent(
      new ErrorEvent("error", { message: "boom", filename: "app.js", lineno: 12 }),
    );

    expect(logger.pending()).toBe(1);
    cleanup();
  });

  it("unhandledrejection'ı logger'a iletir", () => {
    const transport = new RecordingTransport();
    const logger = new ClientLogger({ transport, batchSize: 10, batchIntervalMs: 60_000 });
    const cleanup = installGlobalErrorHandlers(logger);

    const rejected = Promise.reject(new Error("async boom"));
    rejected.catch(() => undefined);

    window.dispatchEvent(
      new PromiseRejectionEvent("unhandledrejection", {
        promise: rejected,
        reason: new Error("async boom"),
      }),
    );

    expect(logger.pending()).toBe(1);
    cleanup();
  });

  it("temizleme fonksiyonu listener'ları kaldırır", () => {
    const transport = new RecordingTransport();
    const logger = new ClientLogger({ transport, batchSize: 10, batchIntervalMs: 60_000 });
    const cleanup = installGlobalErrorHandlers(logger);
    cleanup();

    window.dispatchEvent(new ErrorEvent("error", { message: "x" }));
    expect(logger.pending()).toBe(0);
  });
});
