import { describe, it, expect, expectTypeOf } from "vitest";
import {
  LOG_LEVELS,
  LOG_CATEGORIES,
  isLogLevel,
  isLogCategory,
} from "./types";
import type {
  LogEvent,
  LogEventInput,
  LogCategory,
  LogLevel,
} from "./types";

/**
 * TamperLogger tip sözleşmesi (jenerik — proje-bağımsız):
 *
 * - `LogLevel` ("debug"|"info"|"warn"|"error"|"fatal") — artan şiddet sırasında.
 * - `LogCategory` ("app"|"audit"|"security") — audit/security kanalları fail-closed'dur;
 *   app kanalı güvenilmez kaynaktan (frontend) da gelebilir.
 * - `LogEventInput` — üreticinin doldurduğu alanlar; `ts` opsiyonel (yoksa pipeline
 *   zenginleştirir); `seq/prevHash/signature` GİRDİDE YOKTUR. `eventCode` SERBEST
 *   string'dir (proje sözlüğü validator ile enjekte edilir).
 * - `LogEvent` — TamperLogger çıktısı: `ts, seq, prevHash, signature` her zaman dolu.
 */
describe("tamper-logger tip sözleşmesi", () => {
  it("LogLevel birliği 5 seviyeden oluşur", () => {
    expect(LOG_LEVELS).toEqual(["debug", "info", "warn", "error", "fatal"]);
    expectTypeOf<LogLevel>().toEqualTypeOf<
      "debug" | "info" | "warn" | "error" | "fatal"
    >();
  });

  it("LogCategory birliği 3 kategoriden oluşur", () => {
    expect(LOG_CATEGORIES).toEqual(["app", "audit", "security"]);
    expectTypeOf<LogCategory>().toEqualTypeOf<
      "app" | "audit" | "security"
    >();
  });

  it("isLogLevel geçerli/geçersiz değerleri ayırır", () => {
    expect(isLogLevel("warn")).toBe(true);
    expect(isLogLevel("verbose")).toBe(false);
    expect(isLogLevel("")).toBe(false);
  });

  it("isLogCategory geçerli/geçersiz değerleri ayırır", () => {
    expect(isLogCategory("audit")).toBe(true);
    expect(isLogCategory("system")).toBe(false);
  });

  it("LogEventInput zorunlu alanları taşır; zincir alanları yoktur", () => {
    const input: LogEventInput = {
      level: "info",
      category: "app",
      eventCode: "serbest_string_kod",
      message: "test",
    };
    expect(input.eventCode).toBe("serbest_string_kod");
    // @ts-expect-error — seq zincir alanı girdide YOKTUR
    void (input as { seq: number }).seq;
    expectTypeOf<LogEventInput["eventCode"]>().toEqualTypeOf<string>();
  });

  it("LogEvent çıktısı zincir alanlarını zorunlu taşır", () => {
    const event: LogEvent = {
      level: "info",
      category: "app",
      eventCode: "x",
      message: "test",
      ts: "2026-01-01T00:00:00.000Z",
      seq: 1,
      prevHash: "genesis",
      signature: "a".repeat(64),
    };
    expect(event.seq).toBe(1);
    expect(event.prevHash).toBe("genesis");
    expectTypeOf<LogEvent["seq"]>().toEqualTypeOf<number>();
    expectTypeOf<LogEvent["prevHash"]>().toEqualTypeOf<string>();
    expectTypeOf<LogEvent["signature"]>().toEqualTypeOf<string>();
  });
});
