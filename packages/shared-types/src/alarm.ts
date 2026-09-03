/** Alarm şiddeti — log seviyesine birebir eşlenir (error/warn/info). */
export type AlarmSeverity = "error" | "warning" | "info";

/**
 * Cihaz alarm kuralı — device config'teki TEK alarm kaynağı (Faz 0 eki).
 * Alarm adı = telemetri adı; değerlendirme yalnızca device-service'te,
 * standart TelemetryData akışı üzerinde yapılır (cihaz tipinden bağımsız).
 */
export interface DeviceAlarmRule {
  /** Alarmın bağlandığı telemetri adı — aynı zamanda alarm adıdır. */
  telemetry: string;
  severity: AlarmSeverity;
  description?: string;
  /** true ise value === 0 aktif demektir (varsayılan: value !== 0 aktif). */
  activeLow?: boolean;
}

/** Kural değerlendirmesi sonrası alarm örneği (device-service iç akışı). */
export interface DeviceAlarmSample {
  name: string;
  severity: AlarmSeverity;
  description?: string;
  active: boolean;
}

/**
 * `device_alarms` tablo satırı (UI'a dönen şekil).
 * Tablo imzalı logun türetilmiş projeksiyonudur — geçmiş log_events'te.
 */
export interface DeviceAlarmState {
  deviceId: string;
  alarmName: string;
  severity: AlarmSeverity;
  description?: string;
  active: boolean;
  startedAt?: string;
  endedAt?: string;
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: string;
  lastChangedAt: string;
}
