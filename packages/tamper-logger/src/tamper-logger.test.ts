import { describe, it, expect, vi, afterEach } from "vitest";
import { TamperLogger } from "./tamper-logger";
import type { ILogSink } from "./interfaces";
import type { LogEvent, LogEventInput } from "./types";

/**
 * T0.3 — TamperLogger kontratı (TESTING.md §8.1; tasarım Faz 0):
 *
 * - Pipeline: filter → redact → enrich → sign (HMAC + prevHash zinciri) → fan-out.
 * - `log(input)` komut; olay işlenir ve sink'lere ulaşır. Sink'lere yalnızca
 *   imzalı, zincirli `LogEvent` gider.
 * - Kategori davranışı:
 *   - `app`: batch'lenir (batchSize dolar veya interval geçerse flush).
 *   - `audit`/`security`: fail-closed — batch'e girmez, anında yazılır;
 *     sink başarısızsa `log()` reddeder (işlem iptal edilir).
 *   - app.error/fatal sink başarısızlığında: drop + sayaç + health degraded.
 *   - app.debug/info/warn sink başarısızlığında: drop + sayaç.
 * - Seviye filtresi: yalnızca app kategorisinde; eşiğin altı sessizce düşer
 *   (sink çağrılmaz).
 * - Ring buffer: son N işlenmiş olay `recentEvents(limit?)` ile okunur.
 * - `droppedEvents()` sorgusu; `health()` sorgusu; `close()` kalan batch'i
 *   flush eder ve sink'leri kapatır.
 * - Zincir: ardışık olaylarda prevHash = önceki imza; seq monoton artar.
 */

class FakeSink implements ILogSink {
  written: LogEvent[] = [];
  failWith: Error | undefined;
  closed = false;

  name(): string {
    return "fake";
  }

  async write(events: LogEvent[]): Promise<void> {
    if (this.failWith) throw this.failWith;
    this.written.push(...events);
  }

  async close(): Promise<void> {
    this.closed = true;
  }
}

function makeLogger(overrides: Partial<ConstructorParameters<typeof TamperLogger>[0]> = {}) {
  const sink = new FakeSink();
  const logger = new TamperLogger({
    signingKey: "test-key",
    service: "test-service",
    sinks: [sink],
    batchSize: 2,
    batchIntervalMs: 60_000,
    host: "test-host",
    ...overrides,
  });
  return { logger, sink };
}

function input(over: Partial<LogEventInput> = {}): LogEventInput {
  return {
    level: "info",
    category: "app",
    eventCode: "service_started",
    message: "test",
    ...over,
  };
}

afterEach(() => {
  vi.useRealTimers();
});

describe("TamperLogger eventCodeValidator (jenerik sözlük enjeksiyonu)", () => {
  it("validator reddederse log() fırlatır (fail-closed) — olay sink'e GİTMEZ", async () => {
    const { logger, sink } = makeLogger({
      eventCodeValidator: (code: string) => code === "izinli_kod",
    });
    await expect(
      logger.log(input({ eventCode: "yasakli_kod" })),
    ).rejects.toThrow("geçersiz eventCode: yasakli_kod");
    expect(sink.written).toHaveLength(0);
  });

  it("validator kabul ederse normal akış işler", async () => {
    const { logger, sink } = makeLogger({
      eventCodeValidator: (code: string) => code === "izinli_kod",
      batchSize: 1,
    });
    await logger.log(input({ eventCode: "izinli_kod" }));
    expect(sink.written).toHaveLength(1);
    expect(sink.written[0]?.eventCode).toBe("izinli_kod");
  });

  it("validator verilmezse her string kabul edilir", async () => {
    const { logger, sink } = makeLogger({ batchSize: 1 });
    await logger.log(input({ eventCode: "proje_bagimsiz_kod" }));
    expect(sink.written[0]?.eventCode).toBe("proje_bagimsiz_kod");
  });
});

describe("TamperLogger (T0.3)", () => {
  describe("temel akış", () => {
    it("app olayı batch dolar dolmaz sink'e imzalı gider", async () => {
      const { logger, sink } = makeLogger({ batchSize: 2 });
      await logger.log(input());
      expect(sink.written).toHaveLength(0);
      await logger.log(input({ eventCode: "config_loaded" }));
      expect(sink.written).toHaveLength(2);
      const [first, second] = sink.written;
      expect(first.signature).toMatch(/^[0-9a-f]{64}$/);
      expect(first.seq).toBe(1);
      expect(second.prevHash).toBe(first.signature);
      expect(second.seq).toBe(2);
      expect(first.service).toBe("test-service");
      expect(first.host).toBe("test-host");
    });

    it("interval flush — batch dolmadan da yazılır", async () => {
      vi.useFakeTimers();
      const { logger, sink } = makeLogger({ batchIntervalMs: 1000 });
      await logger.log(input());
      expect(sink.written).toHaveLength(0);
      await vi.advanceTimersByTimeAsync(1000);
      expect(sink.written).toHaveLength(1);
      await logger.close();
    });

    it("context redakte edilir (password görünmez)", async () => {
      const { logger, sink } = makeLogger({ batchSize: 1 });
      await logger.log(
        input({ context: { password: "s3cret", deviceId: "bsc-1" } }),
      );
      const written = sink.written[0];
      expect(written.context).toEqual({ password: "[REDACTED]", deviceId: "bsc-1" });
      expect(JSON.stringify(written)).not.toContain("s3cret");
    });

    it("correlationId yoksa üretilir", async () => {
      const { logger, sink } = makeLogger({ batchSize: 1 });
      await logger.log(input());
      expect(sink.written[0].correlationId).toMatch(/^[0-9a-f-]{36}$/);
    });
  });

  describe("fail-closed (audit/security)", () => {
    it("audit olayı batch'i beklemeden anında yazılır", async () => {
      const { logger, sink } = makeLogger({ batchSize: 100 });
      await logger.log(input({ category: "audit", eventCode: "session_open" }));
      expect(sink.written).toHaveLength(1);
    });

    it("security olayı sink başarısızsa log() reddeder", async () => {
      const { logger, sink } = makeLogger();
      sink.failWith = new Error("audit sink down");
      await expect(
        logger.log(input({ category: "security", eventCode: "login_failed", level: "warn" })),
      ).rejects.toThrow();
    });

    it("audit olayı sink başarısızsa log() reddeder", async () => {
      const { logger, sink } = makeLogger();
      sink.failWith = new Error("audit sink down");
      await expect(
        logger.log(input({ category: "audit", eventCode: "command_executed" })),
      ).rejects.toThrow();
    });
  });

  describe("app kategorisi drop politikası", () => {
    it("error seviyesi sink başarısızsa drop + sayaç + health degraded", async () => {
      const { logger, sink } = makeLogger({ batchSize: 1 });
      sink.failWith = new Error("disk full");
      await logger.log(input({ level: "error", eventCode: "modbus_read_failed" }));
      expect(logger.droppedEvents().error).toBe(1);
      expect(logger.health().status).toBe("degraded");
    });

    it("debug/info sink başarısızsa drop + sayaç, health sağlıklı kalır", async () => {
      const { logger, sink } = makeLogger({ batchSize: 1 });
      sink.failWith = new Error("disk full");
      await logger.log(input({ level: "info", eventCode: "service_started" }));
      const dropped = logger.droppedEvents();
      expect(dropped.error).toBe(0);
      expect(dropped.nonError).toBe(1);
      expect(logger.health().status).toBe("healthy");
    });
  });

  describe("seviye filtresi (yalnızca app)", () => {
    it("eşik altı app olayı sessizce düşer", async () => {
      const { logger, sink } = makeLogger({ batchSize: 1, level: "info" });
      await logger.log(input({ level: "debug", eventCode: "config_loaded" }));
      await logger.close();
      expect(sink.written).toHaveLength(0);
    });

    it("eşik üstü yazılır", async () => {
      const { logger, sink } = makeLogger({ batchSize: 1, level: "info" });
      await logger.log(input({ level: "warn", eventCode: "health_degraded" }));
      expect(sink.written).toHaveLength(1);
    });

    it("audit/security seviye filtresine takılmaz", async () => {
      const { logger, sink } = makeLogger({ level: "fatal" });
      await logger.log(
        input({ category: "security", level: "info", eventCode: "login_failed" }),
      );
      expect(sink.written).toHaveLength(1);
    });
  });

  describe("ring buffer", () => {
    it("son işlenmiş olayları tutar", async () => {
      const { logger } = makeLogger({ batchSize: 1, ringBufferSize: 2 });
      await logger.log(input({ eventCode: "service_started" }));
      await logger.log(input({ eventCode: "config_loaded" }));
      await logger.log(input({ eventCode: "health_degraded" }));
      const recent = logger.recentEvents();
      expect(recent).toHaveLength(2);
      expect(recent[0].eventCode).toBe("config_loaded");
      expect(recent[1].eventCode).toBe("health_degraded");
    });

    it("limit parametresi ile daraltılır", async () => {
      const { logger } = makeLogger({ batchSize: 1 });
      await logger.log(input());
      await logger.log(input({ eventCode: "config_loaded" }));
      expect(logger.recentEvents(1)).toHaveLength(1);
    });
  });

  describe("close()", () => {
    it("kalan batch'i flush eder ve sink'leri kapatır", async () => {
      const { logger, sink } = makeLogger({ batchSize: 100 });
      await logger.log(input());
      expect(sink.written).toHaveLength(0);
      await logger.close();
      expect(sink.written).toHaveLength(1);
      expect(sink.closed).toBe(true);
    });

    it("sonrasında log() yazmaz", async () => {
      const { logger, sink } = makeLogger({ batchSize: 1 });
      await logger.close();
      await expect(logger.log(input())).rejects.toThrow();
      expect(sink.written).toHaveLength(0);
    });
  });

  describe("constructor doğrulaması", () => {
    it("boş sinks kabul edilmez", () => {
      expect(
        () =>
          new TamperLogger({
            signingKey: "k",
            service: "s",
            sinks: [],
          }),
      ).toThrow();
    });

    it("boş signingKey kabul edilmez", () => {
      expect(
        () =>
          new TamperLogger({
            signingKey: "",
            service: "s",
            sinks: [new FakeSink()],
          }),
      ).toThrow();
    });
  });
});
