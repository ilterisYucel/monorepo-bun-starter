import { describe, it, expect, vi } from "vitest";
import { AlertNotifier } from "./alert-notifier";
import type { ILogSink } from "../interfaces";
import type { LogEvent } from "../types";

/**
 * T0.4 — AlertNotifier kontratı (iskelet):
 * - `consider(event)` komut — kurala uyan olayı sink'lere iletir.
 * - Cooldown: aynı eventCode için varsayılan 5 dk'da en fazla 1 bildirim.
 * - Farklı eventCode'lar birbirini engellemez.
 * - Cooldown dolunca aynı kod yeniden bildirilir.
 * - Sink hatası yukarı fırlatılır.
 */

class RecordingSink implements ILogSink {
  events: LogEvent[] = [];
  name(): string {
    return "rec";
  }
  async write(events: LogEvent[]): Promise<void> {
    this.events.push(...events);
  }
  async close(): Promise<void> {}
}

function event(code: string): LogEvent {
  return {
    ts: "2026-08-24T10:00:00.000Z",
    level: "error",
    category: "app",
    eventCode: code as LogEvent["eventCode"],
    message: "x",
    context: {},
    correlationId: "c",
    service: "svc",
    host: "h",
    seq: 1,
    prevHash: "0".repeat(64),
    signature: "a".repeat(64),
  };
}

describe("AlertNotifier (T0.4)", () => {
  it("ilk olay iletilir", async () => {
    const sink = new RecordingSink();
    const notifier = new AlertNotifier({ sinks: [sink] });
    await notifier.consider(event("modbus_read_failed"));
    expect(sink.events).toHaveLength(1);
  });

  it("aynı eventCode cooldown içinde bastırılır", async () => {
    const sink = new RecordingSink();
    const notifier = new AlertNotifier({ sinks: [sink] });
    await notifier.consider(event("modbus_read_failed"));
    await notifier.consider(event("modbus_read_failed"));
    expect(sink.events).toHaveLength(1);
  });

  it("farklı eventCode'lar birbirini engellemez", async () => {
    const sink = new RecordingSink();
    const notifier = new AlertNotifier({ sinks: [sink] });
    await notifier.consider(event("modbus_read_failed"));
    await notifier.consider(event("telemetry_write_failed"));
    expect(sink.events).toHaveLength(2);
  });

  it("cooldown dolunca aynı kod yeniden iletilir", async () => {
    let now = 1_000_000;
    const sink = new RecordingSink();
    const notifier = new AlertNotifier({
      sinks: [sink],
      cooldownMs: 300_000,
      now: () => now,
    });
    await notifier.consider(event("modbus_read_failed"));
    now += 300_001;
    await notifier.consider(event("modbus_read_failed"));
    expect(sink.events).toHaveLength(2);
  });

  it("sink hatası yukarı fırlatılır", async () => {
    const failing: ILogSink = {
      name: () => "f",
      write: vi.fn().mockRejectedValue(new Error("down")),
      close: async () => {},
    };
    const notifier = new AlertNotifier({ sinks: [failing] });
    await expect(notifier.consider(event("modbus_read_failed"))).rejects.toThrow(
      "down",
    );
  });
});
