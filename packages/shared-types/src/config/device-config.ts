// Konfigürasyon tipleri — cihaz, taşıma ve servis konfig dosyalarının sözleşmeleri.

import type { BitfieldConfig } from "../modbus/bitfield";
import type { DeviceAlarmRule } from "../alarm";
import type {
  ModbusTelemetryData,
  CanbusTelemetryData,
  MqttTelemetryData,
} from "../telemetry/telemetry-data";
import type { CommandConfig } from "../commands/command";

/**
 * Konfigürasyon dosyasındaki telemetry girdisi.
 * Protocol tipinden sadece çalışma zamanı alanları (value/timestamp/deviceId)
 * çıkarılmış halidir. Dağıtılmış (distributive) union: her girdi kendi
 * protokolünün alanlarını taşır (`protocol` ile daraltılabilir, örn. "MODBUS"
 * → `registerAddress`). Yeni bir interface değil, mevcut tiplerden türetilmiş
 * type alias.
 */
export type TelemetryConfigEntry = (
  | Omit<ModbusTelemetryData, "value" | "timestamp" | "deviceId">
  | Omit<CanbusTelemetryData, "value" | "timestamp" | "deviceId">
  | Omit<MqttTelemetryData, "value" | "timestamp" | "deviceId">
) & {
  /**
   * Kanonik metrik adı (serbest string — örn: "soc", "battery_ready").
   * device-service tarafından tags.canonical olarak taşınır.
   *
   * TODO: İleride tags yerine ayrı TelemetryData alanına taşınacak.
   */
  canonical?: string;
  /**
   * Yazma politikası — mutlak değişim eşiği (opt-in). Sayı pozitif olmalı;
   * `"auto"` ise ham değeri tam sayı olan girdilerde scale'dan türetilir.
   */
  deadband?: number | "auto";
  /**
   * Yazma politikası — bayatlama sınırı (TTL). `deadband` tanımlıysa zorunlu;
   * değer değişmese bile bu süre sonunda satır garantilenir.
   */
  maxStaleMs?: number;
};

/**
 * Cihaz taşıma katmanı seçimi (cihaz konfig dosyası içinde).
 * - kind: "tcp" | "rtu" → gerçek Modbus bağlantısı (connection alanından beslenir)
 * Yoksa varsayılan "tcp" kabul edilir. Simülatör dalı YOKTUR (device-service
 * yalnız istemcidir — SPEC DEVICE-SERVICE-SADELESTIRME K1).
 */
export interface DeviceTransportConfig {
  kind: "tcp" | "rtu";
}

/** Connector device-subset — device-service'in gördüğü türetilmiş MODBUS cihazı. */
export interface ConnectorDeviceSubset {
  deviceId: string;
  name: string;
  type: string;
  pollIntervalMs?: number;
  connection: Record<string, unknown>;
  telemetry: TelemetryConfigEntry[];
}

/** BSC config'i içindeki `connector` bölümü (connector izleme cihazı). */
export interface ConnectorConfig {
  device: ConnectorDeviceSubset;
}

/**
 * Bir cihaza ait konfigürasyon dosyasının yapısı.
 * Her cihaz için bir dosya, konfigürasyon dizininde yer alır.
 */
export interface DeviceConfigFile {
  deviceId: string;
  name: string;
  manufacturer: string;
  model: string;
  protocol: "MODBUS" | "CANBUS" | "MQTT";
  /** Cihaz tipi (örn. "bsc", "pcs", "emu", "hvac", "cb", "dc-output") — simulator'dan bağımsız, üretimde de gereklidir */
  type?: string;
  /**
   * Cihaz-spesifik opsiyonel nitelikler (örn. `{ rackCount: 8 }`). OPAK passthrough:
   * device-service/web-service YORUMLAMAZ, yalnız taşır; yorum tüketicide (ön yüz / sim).
   */
  details?: Record<string, unknown>;
  connection: Record<string, unknown>;
  telemetry: TelemetryConfigEntry[];
  bitfieldConfigs?: BitfieldConfig[];
  alarms?: DeviceAlarmRule[];
  pollIntervalMs?: number;
  transport?: DeviceTransportConfig;
  connector?: ConnectorConfig;
  commands?: Record<string, CommandConfig>;
  /**
   * Periyodik yazımlar — genel amaçlı (örn. LGES BSC 40000 Controller Heartbeat).
   * `counter` her yazımda 0–255 döner; `fixed` sabit değer yazar.
   * Yazılmazsa BSC 20 sn sonra S-C LOC ile tüm rack kontaktörlerini açar.
   */
  periodicWrites?: PeriodicWriteConfig[];
}

/** Periyodik yazım yapılandırması — nokta adı + aralık + mod. */
export interface PeriodicWriteConfig {
  /** Holding telemetri adı (config telemetry[]'de HOLDING_REGISTER olmalı). */
  point: string;
  /** Yazım aralığı (ms) — heartbeat için doküman: 1 sn. */
  intervalMs: number;
  /** "counter": 0–255 artan sayaç · "fixed": `value` sabit yazılır. */
  mode: "counter" | "fixed";
  /** `mode: "fixed"` için yazılacak değer (0–65535). */
  value?: number;
  /** Aynı değerle yazılacak ek telemetriler (40001–40009 — C2B 1 s güncelleme şartı). */
  extraPoints?: string[];
}
