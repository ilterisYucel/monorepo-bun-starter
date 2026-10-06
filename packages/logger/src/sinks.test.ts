import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, readFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Logger } from "./logger";
import { ConsoleSink } from "./sinks/console-sink";
import { FileSink } from "./sinks/file-sink";
import type { ILogSink, LogRecord } from "./types";

class CapturingSink implements ILogSink {
  readonly records: LogRecord[] = [];
  write(record: LogRecord): void {
    this.records.push(record);
  }
}

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "logger-"));
  vi.spyOn(console, "debug").mockImplementation(() => {});
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
  vi.restoreAllMocks();
});

describe("Logger — UC-2 sink yönetimi", () => {
  it("AK-2.1 — removeSink sonrası kayıt yalnız kalan sink'e gider", () => {
    const first = new CapturingSink();
    const second = new CapturingSink();
    const logger = new Logger({ service: "s" });
    logger.addSink(first);
    logger.addSink(second);

    logger.removeSink(first);
    logger.info("m");

    expect(first.records).toHaveLength(0);
    expect(second.records).toHaveLength(1);
  });

  it("edge — aynı sink iki kez eklenirse tek sayılır", () => {
    const sink = new CapturingSink();
    const logger = new Logger({ service: "s" });
    logger.addSink(sink);
    logger.addSink(sink);

    logger.info("m");

    expect(sink.records).toHaveLength(1);
  });

  it("edge — listede olmayan sink'i çıkarmak no-op'tur", () => {
    const sink = new CapturingSink();
    const logger = new Logger({ service: "s" });

    expect(() => logger.removeSink(sink)).not.toThrow();
    logger.addSink(sink);
    logger.info("m");
    expect(sink.records).toHaveLength(1);
  });
});

describe("FileSink — UC-2", () => {
  it("AK-2.3 — JSON satırları append eder; close stream'i kapatır", async () => {
    const path = join(dir, "app.log");
    const sink = new FileSink({ path });
    const logger = new Logger({ service: "s" });
    logger.addSink(sink);

    logger.info("bir", { n: 1 });
    logger.warn("iki");
    await logger.close();

    const lines = readFileSync(path, "utf8").trim().split("\n");
    expect(lines).toHaveLength(2);
    const first = JSON.parse(lines[0]!) as LogRecord;
    expect(first.message).toBe("bir");
    expect(first.context).toEqual({ n: 1 });
    const second = JSON.parse(lines[1]!) as LogRecord;
    expect(second.level).toBe("warn");
  });

  it("edge — üst dizin yoksa oluşturur", () => {
    const path = join(dir, "nested", "deep", "app.log");
    const sink = new FileSink({ path });
    const logger = new Logger({ service: "s" });
    logger.addSink(sink);

    expect(() => logger.info("m")).not.toThrow();
    expect(existsSync(path)).toBe(true);
  });

  it("close sonrası yazma reddedilir", () => {
    const sink = new FileSink({ path: join(dir, "x.log") });
    sink.close();

    expect(() =>
      sink.write({ ts: "t", level: "info", service: "s", message: "m" }),
    ).toThrow();
  });
});

describe("ConsoleSink", () => {
  it("insan-okur tek satırı seviye metoduna yazar", () => {
    const sink = new ConsoleSink();
    const record: LogRecord = {
      ts: "2026-10-05T10:00:00.000Z",
      level: "info",
      service: "device-service",
      component: "DeviceService",
      message: "başladı",
      context: { n: 1 },
    };

    sink.write(record);

    expect(console.info).toHaveBeenCalledTimes(1);
    const line = vi.mocked(console.info).mock.calls[0]![0] as string;
    expect(line).toContain("2026-10-05T10:00:00.000Z");
    expect(line).toContain("[info]");
    expect(line).toContain("[device-service/DeviceService]");
    expect(line).toContain("başladı");
    expect(line).toContain('{"n":1}');
  });

  it("seviyeyi doğru console metoduna eşler", () => {
    const sink = new ConsoleSink();
    const base = { ts: "t", service: "s", message: "m" } as const;

    sink.write({ ...base, level: "debug" });
    sink.write({ ...base, level: "warn" });
    sink.write({ ...base, level: "error" });

    expect(console.debug).toHaveBeenCalledTimes(1);
    expect(console.warn).toHaveBeenCalledTimes(1);
    expect(console.error).toHaveBeenCalledTimes(1);
  });
});
