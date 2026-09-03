import { describe, it, expect } from "vitest";
import { AlarmTransitionDetector, alarmSamples } from "./alarm-transition-detector";
import type { DeviceAlarmRule } from "@gd-monorepo/shared-types";

/**
 * AlarmTransitionDetector sözleşmesi (Faz 0 eki — dedup semantiği):
 * - Yükselen kenar (pasif→aktif) → BİR KEZ "set" geçişi.
 * - Aktifken tekrar eden okuma → SESSİZ (aynı alarm birden fazla yazılmaz).
 * - Düşen kenar (aktif→pasif) → "clear" geçişi.
 * - Clear sonrası (çözüldükten sonra) yeni aktif → YENİDEN "set" (tek).
 * - reset(deviceId): cihazın durumunu unutur — restart sonrası aktif koşul
 *   yeniden yükselen kenar sayılır.
 */

function sample(name: string, active: boolean) {
  return { name, severity: "error" as const, active };
}

describe("alarmSamples (kural → örnek)", () => {
  it("kural telemetri adıyla eşleşir", () => {
    const rules: DeviceAlarmRule[] = [
      { telemetry: "BSC Fault", severity: "error" },
    ];
    const samples = alarmSamples(rules, [
      { name: "Voltage", value: 230, timestamp: "t", deviceId: "d" },
      { name: "BSC Fault", value: 1, timestamp: "t", deviceId: "d" },
    ]);
    expect(samples).toEqual([
      { name: "BSC Fault", severity: "error", active: true, description: undefined },
    ]);
  });

  it("value !== 0 → aktif (varsayılan)", () => {
    const rules: DeviceAlarmRule[] = [
      { telemetry: "A", severity: "warning" },
    ];
    const samples = alarmSamples(rules, [
      { name: "A", value: 0, timestamp: "t", deviceId: "d" },
    ]);
    expect(samples[0].active).toBe(false);
  });

  it("activeLow: value === 0 → aktif", () => {
    const rules: DeviceAlarmRule[] = [
      { telemetry: "A", severity: "error", activeLow: true },
    ];
    const samples = alarmSamples(rules, [
      { name: "A", value: 0, timestamp: "t", deviceId: "d" },
    ]);
    expect(samples[0].active).toBe(true);
  });

  it("telemetri üretilmediyse örnek yok (geçiş yok — durum korunur)", () => {
    const rules: DeviceAlarmRule[] = [
      { telemetry: "A", severity: "error" },
    ];
    const samples = alarmSamples(rules, [
      { name: "Voltage", value: 230, timestamp: "t", deviceId: "d" },
    ]);
    expect(samples).toEqual([]);
  });

  it("kural yoksa örnek yok", () => {
    expect(alarmSamples([], [])).toEqual([]);
  });

  it("aynı isimli birden fazla satır OR ile birleşir (rack başına alanlar)", () => {
    const rules: DeviceAlarmRule[] = [
      { telemetry: "BSC Fault", severity: "error" },
    ];
    const samples = alarmSamples(rules, [
      { name: "BSC Fault", value: 0, timestamp: "t", deviceId: "d", tags: { rack_id: "1" } },
      { name: "BSC Fault", value: 1, timestamp: "t", deviceId: "d", tags: { rack_id: "2" } },
    ]);
    expect(samples[0].active).toBe(true);
  });

  it("aynı isimli TÜM satırlar pasifse alarm pasiftir", () => {
    const rules: DeviceAlarmRule[] = [
      { telemetry: "BSC Fault", severity: "error" },
    ];
    const samples = alarmSamples(rules, [
      { name: "BSC Fault", value: 0, timestamp: "t", deviceId: "d" },
      { name: "BSC Fault", value: 0, timestamp: "t", deviceId: "d" },
    ]);
    expect(samples[0].active).toBe(false);
  });
});

describe("AlarmTransitionDetector (dedup state machine)", () => {
  it("yükselen kenar → tek set", () => {
    const detector = new AlarmTransitionDetector();
    expect(detector.detect("d-1", [sample("A", true)])).toEqual([
      expect.objectContaining({ name: "A", kind: "set" }),
    ]);
  });

  it("aktifken tekrar eden okuma sessizdir", () => {
    const detector = new AlarmTransitionDetector();
    detector.detect("d-1", [sample("A", true)]);
    expect(detector.detect("d-1", [sample("A", true)])).toEqual([]);
    expect(detector.detect("d-1", [sample("A", true)])).toEqual([]);
  });

  it("düşen kenar → clear", () => {
    const detector = new AlarmTransitionDetector();
    detector.detect("d-1", [sample("A", true)]);
    expect(detector.detect("d-1", [sample("A", false)])).toEqual([
      expect.objectContaining({ name: "A", kind: "clear" }),
    ]);
  });

  it("clear sonrası yeni aktif → yeniden tek set", () => {
    const detector = new AlarmTransitionDetector();
    detector.detect("d-1", [sample("A", true)]);
    detector.detect("d-1", [sample("A", false)]);
    const transitions = detector.detect("d-1", [sample("A", true)]);
    expect(transitions).toEqual([
      expect.objectContaining({ name: "A", kind: "set" }),
    ]);
    expect(detector.detect("d-1", [sample("A", true)])).toEqual([]);
  });

  it("cihazlar birbirinden izoledir", () => {
    const detector = new AlarmTransitionDetector();
    detector.detect("d-1", [sample("A", true)]);
    expect(detector.detect("d-2", [sample("A", true)])).toHaveLength(1);
    expect(detector.detect("d-1", [sample("A", true)])).toEqual([]);
  });

  it("reset cihazın tüm alarm durumlarını unutur", () => {
    const detector = new AlarmTransitionDetector();
    detector.detect("d-1", [sample("A", true)]);
    detector.reset("d-1");
    // Restart sonrası aktif koşul → yeniden yükselen kenar
    expect(detector.detect("d-1", [sample("A", true)])).toEqual([
      expect.objectContaining({ name: "A", kind: "set" }),
    ]);
  });

  it("reset yalnızca hedef cihazı etkiler", () => {
    const detector = new AlarmTransitionDetector();
    detector.detect("d-1", [sample("A", true)]);
    detector.detect("d-2", [sample("A", true)]);
    detector.reset("d-1");
    expect(detector.detect("d-2", [sample("A", true)])).toEqual([]);
    expect(detector.detect("d-1", [sample("A", true)])).toHaveLength(1);
  });

  it("aynı pollda birden fazla yükselen kenar toplu döner", () => {
    const detector = new AlarmTransitionDetector();
    const transitions = detector.detect("d-1", [
      sample("A", true),
      sample("B", true),
    ]);
    expect(transitions).toEqual([
      expect.objectContaining({ name: "A", kind: "set" }),
      expect.objectContaining({ name: "B", kind: "set" }),
    ]);
  });

  it("hiç aktif olmamış alarmda pasif örnek geçiş üretmez (kenar yok)", () => {
    const detector = new AlarmTransitionDetector();
    expect(detector.detect("d-1", [sample("B", false)])).toEqual([]);
  });
});
