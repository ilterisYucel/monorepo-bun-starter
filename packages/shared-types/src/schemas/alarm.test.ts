import { describe, it, expect, expectTypeOf } from "vitest";
import {
  bitfieldFieldSchema,
  deviceConfigFileSchema,
  deviceAlarmRuleSchema,
} from "./device-config";

/**
 * Alarm şeması sözleşmesi (Faz 0 eki — cihaz alarm sistemi):
 * - `alarms` üst seviye bölümü: telemetry adı referansı + severity enum.
 * - `bitfieldFieldSchema`'da alarmLimit/logType YOKTUR — bilinmeyen anahtarlar
 *   strip edilir (bitfield = saf ölçüm çıkarımı; alarm anlamı config kuralındadır).
 */

const validField = {
  bitStart: 0,
  bitEnd: 0,
  name: "BSC Alarm",
  dataTag: "d1",
  description: "Alarm biti",
  unit: "-",
};

const validDevice = {
  deviceId: "bsc-1",
  name: "BSC 1",
  manufacturer: "LG",
  model: "BSC",
  protocol: "MODBUS" as const,
  connection: { host: "127.0.0.1" },
  telemetry: [
    { protocol: "MODBUS" as const, name: "Voltage" },
    { protocol: "MODBUS" as const, name: "BSC Alarm" },
  ],
};

describe("device alarm kuralı şeması", () => {
  it("alarms bölümünü kabul eder", () => {
    const r = deviceConfigFileSchema.safeParse({
      ...validDevice,
      alarms: [{ telemetry: "BSC Alarm", severity: "error" }],
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.alarms).toEqual([
        { telemetry: "BSC Alarm", severity: "error" },
      ]);
    }
  });

  it("geçersiz severity reddedilir", () => {
    const r = deviceAlarmRuleSchema.safeParse({
      telemetry: "x",
      severity: "fatal",
    });
    expect(r.success).toBe(false);
  });

  it("telemetry boş olamaz", () => {
    const r = deviceAlarmRuleSchema.safeParse({
      telemetry: "",
      severity: "error",
    });
    expect(r.success).toBe(false);
  });

  it("activeLow opsiyoneldir (varsayılan false)", () => {
    const r = deviceAlarmRuleSchema.safeParse({
      telemetry: "x",
      severity: "warning",
      activeLow: true,
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.activeLow).toBe(true);
  });

  it("alarms yoksa config yine geçerli (geriye uyumlu)", () => {
    const r = deviceConfigFileSchema.safeParse(validDevice);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.alarms).toBeUndefined();
  });
});

describe("bitfield alarmLimit/logType temizliği", () => {
  it("alarmLimit artık şemada yok — strip edilir", () => {
    const r = bitfieldFieldSchema.safeParse({ ...validField, alarmLimit: "Fault" });
    expect(r.success).toBe(true);
    if (r.success) {
      expect("alarmLimit" in r.data).toBe(false);
    }
  });

  it("logType artık şemada yok — strip edilir", () => {
    const r = bitfieldFieldSchema.safeParse({ ...validField, logType: "error" });
    expect(r.success).toBe(true);
    if (r.success) {
      expect("logType" in r.data).toBe(false);
    }
  });

  it("çıktı tipi alarmLimit/logType taşımaz (derleme kontratı)", () => {
    const r = bitfieldFieldSchema.safeParse(validField);
    if (r.success) {
      expectTypeOf(r.data).not.toHaveProperty("alarmLimit");
      expectTypeOf(r.data).not.toHaveProperty("logType");
    }
  });
});
