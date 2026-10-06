import { describe, it, expect, beforeEach, vi } from "vitest";
import { Logger } from "./logger";
import type { ILogSink, LogRecord } from "./types";

/** Test double — kayıtları bellekte toplar. */
class CapturingSink implements ILogSink {
  readonly records: LogRecord[] = [];
  closed = 0;

  write(record: LogRecord): void {
    this.records.push(record);
  }

  close(): void {
    this.closed += 1;
  }
}

/** write'ı throw eden sink — hata izolasyonu testleri için. */
class ThrowingSink implements ILogSink {
  writes = 0;
  write(): void {
    this.writes += 1;
    throw new Error("sink patladı");
  }
}

beforeEach(() => {
  vi.spyOn(console, "debug").mockImplementation(() => {});
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("Logger — UC-1 temel loglama ve format", () => {
  it("AK-1.1 — info kaydı ts/level/service/message/context taşır", () => {
    const sink = new CapturingSink();
    const logger = new Logger({ service: "device-service" });
    logger.addSink(sink);

    logger.info("cihaz başlatıldı", { deviceId: "bsc-1" });

    expect(sink.records).toHaveLength(1);
    const rec = sink.records[0]!;
    expect(rec.level).toBe("info");
    expect(rec.service).toBe("device-service");
    expect(rec.message).toBe("cihaz başlatıldı");
    expect(rec.context).toEqual({ deviceId: "bsc-1" });
    expect(Number.isNaN(Date.parse(rec.ts))).toBe(false);
    expect(rec.component).toBeUndefined();
  });

  it("AK-1.1 — context'siz kayıt da üretilir", () => {
    const sink = new CapturingSink();
    const logger = new Logger({ service: "s" });
    logger.addSink(sink);

    logger.warn("yalnız mesaj");

    expect(sink.records).toHaveLength(1);
    expect(sink.records[0]!.context).toBeUndefined();
    expect(sink.records[0]!.message).toBe("yalnız mesaj");
  });

  it("AK-1.2 — eşiğin altındaki seviye sink'e ulaşmaz", () => {
    const sink = new CapturingSink();
    const logger = new Logger({ service: "s", level: "warn" });
    logger.addSink(sink);

    logger.debug("d");
    logger.info("i");
    expect(sink.records).toHaveLength(0);

    logger.warn("w");
    logger.error("e");
    expect(sink.records.map((r) => r.level)).toEqual(["warn", "error"]);
  });

  it("AK-1.3 — level verilmezse info varsayılan olur", () => {
    const sink = new CapturingSink();
    const logger = new Logger({ service: "s" });
    logger.addSink(sink);

    logger.debug("görünmez");
    logger.info("görünür");

    expect(sink.records.map((r) => r.message)).toEqual(["görünür"]);
  });

  it("AK-1.4 — level altı çağrıda sink'e kayıt üretilmez (no-op)", () => {
    const sink = new CapturingSink();
    const logger = new Logger({ service: "s", level: "error" });
    logger.addSink(sink);
    const sinkWrite = vi.spyOn(sink, "write");

    logger.info("m", { a: 1 });
    logger.debug("m");
    logger.warn("m");

    expect(sinkWrite).not.toHaveBeenCalled();
    expect(sink.records).toHaveLength(0);
  });

  it("boş service constructor'da throw eder", () => {
    expect(() => new Logger({ service: "" })).toThrow();
  });

  it("edge — fonksiyon/sembol içeren context güvenle elenir", () => {
    const sink = new CapturingSink();
    const logger = new Logger({ service: "s" });
    logger.addSink(sink);

    expect(() =>
      logger.info("m", { fn: () => {}, sym: Symbol("x"), ok: 1 }),
    ).not.toThrow();

    expect(sink.records).toHaveLength(1);
    expect(sink.records[0]!.context).toEqual({ ok: 1 });
  });

  it("edge — döngüsel context throw etmez, kayıt üretilir", () => {
    const sink = new CapturingSink();
    const logger = new Logger({ service: "s" });
    logger.addSink(sink);
    const cyclic: Record<string, unknown> = { ad: "x" };
    cyclic.self = cyclic;

    expect(() => logger.info("döngü", { cyclic })).not.toThrow();
    expect(sink.records).toHaveLength(1);
  });
});

describe("Logger — UC-3 child logger", () => {
  it("AK-3.2 — child component taşır, service parent'ınkidir", () => {
    const sink = new CapturingSink();
    const logger = new Logger({ service: "device-service" });
    logger.addSink(sink);

    const child = logger.child("DeviceService");
    child.info("alt kayıt");

    expect(sink.records).toHaveLength(1);
    expect(sink.records[0]!.component).toBe("DeviceService");
    expect(sink.records[0]!.service).toBe("device-service");
  });

  it("AK-3.1 — parent'a sonradan eklenen sink child kayıtlarını da alır", () => {
    const logger = new Logger({ service: "s" });
    const child = logger.child("X");
    const sink = new CapturingSink();

    logger.addSink(sink);
    child.info("alt");

    expect(sink.records).toHaveLength(1);
    expect(sink.records[0]!.component).toBe("X");
  });

  it("child parent'ın level'ini devralır", () => {
    const sink = new CapturingSink();
    const logger = new Logger({ service: "s", level: "error" });
    logger.addSink(sink);

    const child = logger.child("X");
    child.warn("görünmez");
    child.error("görünür");

    expect(sink.records.map((r) => r.level)).toEqual(["error"]);
  });

  it("edge — boş component kaydı etiketsiz üretir", () => {
    const sink = new CapturingSink();
    const logger = new Logger({ service: "s" });
    logger.addSink(sink);

    logger.child("").info("m");

    expect(sink.records[0]!.component).toBeUndefined();
  });
});

describe("Logger — close ve hata izolasyonu", () => {
  it("AK-2.2 — bir sink throw edince diğeri yazar, logger throw etmez", () => {
    const bad = new ThrowingSink();
    const good = new CapturingSink();
    const logger = new Logger({ service: "s" });
    logger.addSink(bad);
    logger.addSink(good);

    expect(() => logger.info("m")).not.toThrow();

    expect(bad.writes).toBe(1);
    expect(good.records).toHaveLength(1);
  });

  it("AK-2.2 — async sink reddederse logger throw etmez", async () => {
    const good = new CapturingSink();
    const logger = new Logger({ service: "s" });
    logger.addSink({ write: () => Promise.reject(new Error("rej")) });
    logger.addSink(good);

    expect(() => logger.info("m")).not.toThrow();
    await Promise.resolve();

    expect(good.records).toHaveLength(1);
  });

  it("close tüm sink'lerin close'unu çağırır, hata yutulur", async () => {
    const a = new CapturingSink();
    const b = new CapturingSink();
    const logger = new Logger({ service: "s" });
    logger.addSink(a);
    logger.addSink(b);
    logger.addSink({ write() {}, close() { throw new Error("kapanmadı"); } });

    await expect(logger.close()).resolves.toBeUndefined();
    expect(a.closed).toBe(1);
    expect(b.closed).toBe(1);
  });
});
