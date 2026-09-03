import { describe, it, expect } from "vitest";
import { LOG_EVENT_CODES, isLogEventCode } from "./event-codes";

/**
 * GD-PMS olay sözlüğü kontratı (platform):
 * - `LOG_EVENT_CODES`: kayıtlı tüm eventCode'ların kapalı kümesi.
 * - `isLogEventCode`: çalışma zamanı doğrulayıcı — TamperLogger
 *   `eventCodeValidator` enjeksiyon noktasına bağlanır (fail-closed).
 */
describe("GD-PMS olay sözlüğü", () => {
  it("kayıtlı kodlar doğrulanır", () => {
    expect(isLogEventCode("login_locked")).toBe(true);
    expect(isLogEventCode("device_alarm")).toBe(true);
    expect(isLogEventCode("service_started")).toBe(true);
    expect(isLogEventCode("audit_sink_failure")).toBe(true);
  });

  it("bilinmeyen kodlar reddedilir", () => {
    expect(isLogEventCode("order_created")).toBe(false);
    expect(isLogEventCode("")).toBe(false);
    expect(isLogEventCode("login_locked_")).toBe(false);
  });

  it("küme boş değildir ve benzersizdir", () => {
    expect(LOG_EVENT_CODES.length).toBeGreaterThan(30);
    expect(new Set(LOG_EVENT_CODES).size).toBe(LOG_EVENT_CODES.length);
  });
});
