import type { DeviceAlarmRule, DeviceAlarmSample } from "@gd-monorepo/shared-types";
import type { TelemetryData } from "@gd-monorepo/shared-types";

/** Geçiş türü — yükselen kenar "set", düşen kenar "clear". */
export type AlarmTransitionKind = "set" | "clear";

/** Tek bir alarm geçişi (yalnızca kenarlarda üretilir). */
export interface AlarmTransition {
  name: string;
  severity: DeviceAlarmSample["severity"];
  description?: string;
  kind: AlarmTransitionKind;
}

/**
 * Config kurallarını telemetri akışına uygular — cihaz tipinden bağımsız.
 * Aynı isimli birden fazla telemetri satırı (örn. rack başına) OR ile
 * birleştirilir: herhangi biri aktifse cihaz alarmı aktiftir.
 * Telemetri üretilmemişse örnek yoktur (geçiş yok — önceki durum korunur).
 */
export function alarmSamples(
  rules: DeviceAlarmRule[],
  telemetry: TelemetryData[],
): DeviceAlarmSample[] {
  if (rules.length === 0) return [];

  const byName = new Map<string, TelemetryData[]>();
  for (const entry of telemetry) {
    const list = byName.get(entry.name);
    if (list) list.push(entry);
    else byName.set(entry.name, [entry]);
  }

  const samples: DeviceAlarmSample[] = [];
  for (const rule of rules) {
    const entries = byName.get(rule.telemetry);
    if (!entries || entries.length === 0) continue;
    const active = entries.some((entry) => {
      const value = Number(entry.value) ?? 0;
      return rule.activeLow ? value === 0 : value !== 0;
    });
    samples.push({
      name: rule.telemetry,
      severity: rule.severity,
      description: rule.description,
      active,
    });
  }
  return samples;
}

/**
 * AlarmTransitionDetector — saf geçiş durum makinesi (I/O yok).
 * Mutable by design (state machine — cihaz başına son aktiflik izi):
 * yükselen kenar tek "set", düşen kenar "clear", aktifken sessiz.
 */
export class AlarmTransitionDetector {
  private readonly lastActive = new Map<string, boolean>();

  /** Verilen örneklerdeki kenar geçişlerini döner (sorgu + durum ilerletir). */
  detect(deviceId: string, samples: DeviceAlarmSample[]): AlarmTransition[] {
    const transitions: AlarmTransition[] = [];
    for (const sample of samples) {
      const key = `${deviceId}:${sample.name}`;
      const last = this.lastActive.get(key);

      if (sample.active && last !== true) {
        transitions.push({
          name: sample.name,
          severity: sample.severity,
          description: sample.description,
          kind: "set",
        });
      } else if (!sample.active && last === true) {
        transitions.push({
          name: sample.name,
          severity: sample.severity,
          description: sample.description,
          kind: "clear",
        });
      }
      this.lastActive.set(key, sample.active);
    }
    return transitions;
  }

  /** Cihazın tüm alarm izlerini unutur — restart sonrası yeni gözlem dönemi. */
  reset(deviceId: string): void {
    const prefix = `${deviceId}:`;
    for (const key of [...this.lastActive.keys()]) {
      if (key.startsWith(prefix)) this.lastActive.delete(key);
    }
  }
}
