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
 * - kind: "simulator" → simülatör transport'u (type: simülatör tipi)
 * Yoksa varsayılan "tcp" kabul edilir.
 */
export interface DeviceTransportConfig {
  kind: "tcp" | "rtu" | "simulator";
  /** Simülatör tipi (kind === "simulator" iken zorunlu) */
  type?: string;
  registerMap?: string;
  pcsCount?: number;
  /** Wattox PCS simülatörü BMS port sunucu portu (yalnızca wattox-pcs + simulator) */
  bmsPort?: number;
}

/** Simülatör konfigürasyonu (cihaz konfig dosyası içinde) */
export interface SimulatorConfig {
  type: "bsc" | "hvac" | "xrack" | "cb" | "dc-output" | "dc-meter" | "energy-analyzer" | "wattox-pcs";
  rackCount?: number;
  registerMap?: string;
  pcsCount?: number;
  bmsPort?: number;
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

/** PCS güç kaynağı endpoint'i — connector ters kanalı (S16 okuma). */
export interface PcsPowerSource {
  deviceId: string;
  host: string;
  port: number;
  unitId?: number;
}

/** Connector sim-subset — yalnız SimulatorHost'un okuduğu sim tarafı. */
export interface ConnectorSimSubset {
  registerMap: string;
  target?: { host?: string; port?: number };
  intervalMs?: number;
  /** Ters kanal: PCS EMS S16 → BSC güç girdisi (opsiyonel). */
  pcsSources?: PcsPowerSource[];
  /** Ters kanal güç ölçeği (okunan toplam × scale). Demo: 9 (istasyon ölçeği). */
  powerScale?: number;
}

/** BSC config'i içindeki `connector` bölümü (BSC→PCS link simülasyonu). */
export interface ConnectorConfig {
  device: ConnectorDeviceSubset;
  sim?: ConnectorSimSubset;
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
   * Periyodik heartbeat yazımı (örn. LGES BSC 40000 Controller Heartbeat — 1 sn).
   * Değer her `intervalMs`'de artan sayaçtır (0-255 döngü); yazılmazsa BSC
   * 20 sn sonra S-C LOC ile tüm rack kontaktörlerini açar.
   */
  heartbeat?: DeviceHeartbeatConfig;
}

/** Heartbeat yazım yapılandırması — holding telemetri adı + aralık. */
export interface DeviceHeartbeatConfig {
  /** Holding telemetri adı (config telemetry[]'de HOLDING_REGISTER olmalı). */
  telemetry: string;
  /** Yazım aralığı (ms) — doküman: 1 sn. */
  intervalMs: number;
  /** Ek heartbeat telemetrileri (40001–40009 — C2B 1 s güncelleme şartı). */
  extraTelemetries?: string[];
}
