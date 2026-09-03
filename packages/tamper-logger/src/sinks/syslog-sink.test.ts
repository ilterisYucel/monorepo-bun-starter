import { describe, it, expect, vi, afterEach } from "vitest";
import { SyslogSink } from "./syslog-sink";
import type { LogEvent } from "../types";

/**
 * SyslogSink (T6.2) sözleşmesi:
 * - RFC 5424 frame: PRI(13*kategori+severity) + sürüm + RFC3339 zaman + host +
 *   app + procid + msgid + "-" (structured-data) + JSON gövde.
 * - UDP: her olay AYRI datagram (RFC 6587 non-transparent framing).
 * - TCP: mesajlar `\n` ile frame'lenir, bağlantı kapanırsa yeniden kurulur.
 * - close() idempotent; kapatıldıktan sonra write fırlatır.
 * - Hata fırlatma: sink içi hata yukarı iletir (drop kararı logger'dadır).
 */

function makeEvent(overrides?: Partial<LogEvent>): LogEvent {
  return {
    ts: "2026-08-26T12:00:00.000Z",
    level: "error",
    category: "security",
    eventCode: "login_failed",
    message: "Giris basarisiz",
    context: { username: "admin" },
    correlationId: "c-1",
    service: "web-service",
    host: "field-1",
    seq: 1,
    prevHash: "0",
    signature: "sig",
    ...overrides,
  } as LogEvent;
}

describe("SyslogSink — RFC 5424 frame (T6.2)", () => {
  it("PRI severity eşlemesi + zorunlu alanlar", () => {
    // facility 13 (log audit) → error(3): 13*8+3 = 107
    const frame = (SyslogSink as unknown as {
      formatFrame: (event: LogEvent, host: string, app: string) => string;
    }).formatFrame(makeEvent(), "field-1", "gd-web-service");
    expect(frame.startsWith("<107>1 ")).toBe(true);
    expect(frame).toContain("field-1 gd-web-service");
    expect(frame).toContain('"login_failed"');
    expect(frame).toContain(" - ");
  });

  it("warn(4) → 108, info(6) → 110", () => {
    const formatFrame = (SyslogSink as unknown as {
      formatFrame: (event: LogEvent, host: string, app: string) => string;
    }).formatFrame;
    expect(formatFrame(makeEvent({ level: "warn" }), "h", "a").startsWith("<108>1 ")).toBe(true);
    expect(formatFrame(makeEvent({ level: "info" }), "h", "a").startsWith("<110>1 ")).toBe(true);
  });
});

describe("SyslogSink — UDP transport (T6.2)", () => {
  let sends: Buffer[] = [];

  const mockSocket = {
    send: vi.fn((buf: Buffer, _port: number, _host: string, cb?: (e?: Error) => void) => {
      sends.push(buf);
      cb?.(undefined);
    }),
    close: vi.fn(),
  };

  const createSocket = vi.fn(() => mockSocket);

  afterEach(() => {
    sends = [];
    vi.restoreAllMocks();
  });

  it("her olay ayrı datagram olarak gönderilir", async () => {
    const sink = new SyslogSink(
      { protocol: "udp", host: "127.0.0.1", port: 514 },
      createSocket as never,
    );
    await sink.write([makeEvent(), makeEvent({ eventCode: "session_open" })]);
    expect(createSocket).toHaveBeenCalledTimes(1);
    expect(sends).toHaveLength(2);
    expect(sends[0].toString()).toContain("login_failed");
    expect(sends[1].toString()).toContain("session_open");
    await sink.close();
  });

  it("close idempotent; kapandıktan sonra write fırlatır", async () => {
    const sink = new SyslogSink(
      { protocol: "udp", host: "127.0.0.1", port: 514 },
      createSocket as never,
    );
    await sink.close();
    await sink.close();
    await expect(sink.write([makeEvent()])).rejects.toThrow();
  });
});
