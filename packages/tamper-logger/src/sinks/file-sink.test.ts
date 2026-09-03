import { describe, it, expect, afterAll } from "vitest";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FileSink } from "./file-sink";
import type { LogEvent } from "../types";

/**
 * T0.4 — FileSink kontratı:
 * - Append-only dosya sink'i; her olay satır sonuyla ayrılmış JSON satırı.
 * - Her flush sonrası fsync (dayanıklılık).
 * - Zincir verileri (seq/prevHash/signature) dosyaya birebir yazılır —
 *   `tools/verify-log.mjs` bu dosyayı doğrular.
 * - `close()` sonrası `write()` reddedilir.
 */

const dirs: string[] = [];

async function tmpFile(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "file-sink-"));
  dirs.push(dir);
  return join(dir, "app.log");
}

function event(seq: number, prevHash: string, signature: string): LogEvent {
  return {
    ts: "2026-08-24T10:00:00.000Z",
    level: "info",
    category: "app",
    eventCode: "service_started",
    message: "test",
    context: {},
    correlationId: "c",
    service: "svc",
    host: "h",
    seq,
    prevHash,
    signature,
  };
}

afterAll(async () => {
  await Promise.allSettled(dirs.map((d) => rm(d, { recursive: true, force: true })));
});

describe("FileSink (T0.4)", () => {
  it("name() 'file' döner", () => {
    expect(new FileSink({ path: "/tmp/x.log" }).name()).toBe("file");
  });

  it("olayları satır satır append eder", async () => {
    const path = await tmpFile();
    const sink = new FileSink({ path });
    const first = event(1, "0".repeat(64), "a".repeat(64));
    const second = event(2, first.signature, "b".repeat(64));
    await sink.write([first]);
    await sink.write([second]);
    await sink.close();

    const lines = (await readFile(path, "utf8")).trim().split("\n");
    expect(lines).toHaveLength(2);
    const parsed = lines.map((l) => JSON.parse(l) as LogEvent);
    expect(parsed[0].seq).toBe(1);
    expect(parsed[1].prevHash).toBe(parsed[0].signature);
  });

  it("close() sonrası write() reddedilir", async () => {
    const sink = new FileSink({ path: await tmpFile() });
    await sink.close();
    await expect(sink.write([event(1, "0".repeat(64), "a".repeat(64))])).rejects.toThrow();
  });

  it("boş dizi yazılmaz (dosya açılmaz)", async () => {
    const path = await tmpFile();
    const sink = new FileSink({ path });
    await sink.write([]);
    await sink.close();
    await expect(readFile(path, "utf8")).rejects.toThrow();
  });
});
