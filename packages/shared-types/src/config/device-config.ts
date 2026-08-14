// Konfigürasyon tipleri — cihaz, taşıma ve servis konfig dosyalarının sözleşmeleri.

import type { BitfieldConfig } from "../modbus/bitfield";
import type {
  ModbusTelemetryData,
  CanbusTelemetryData,
  MqttTelemetryData,
} from "../telemetry/telemetry-data";
import type { CommandConfig } from "../commands/command";

/**
 * Konfigürasyon dosyasındaki telemetry girdisi.
 * Protocol tipinden sadece çalışma zamanı alanları çıkarılmış halidir.
 * Yeni bir interface değil, mevcut tiplerden türetilmiş type alias.
 */
export type TelemetryConfigEntry = Omit<
  ModbusTelemetryData | CanbusTelemetryData | MqttTelemetryData,
  "value" | "timestamp" | "deviceId"
> & {
  /**
   * Kanonik metrik adı (serbest string — örn: "soc", "battery_ready").
   * device-service tarafından tags.canonical olarak taşınır.
   *
   * TODO: İleride tags yerine ayrı TelemetryData alanına taşınacak.
   */
  canonical?: string;
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
  rackCount?: number;
  registerMap?: string;
  pcsCount?: number;
}

/** Simülatör konfigürasyonu (cihaz konfig dosyası içinde) */
export interface SimulatorConfig {
  type: "bsc" | "hvac" | "xrack" | "cb" | "dc-output" | "energy-analyzer" | "pcs" | "emu";
  rackCount?: number;
  registerMap?: string;
  pcsCount?: number;
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
  /** Rack sayısı (cihaz özelliği — örn. BSC: 8). UI rack grafikleri ve cihaz kaydı için. */
  rackCount?: number;
  connection: Record<string, unknown>;
  telemetry: TelemetryConfigEntry[];
  bitfieldConfigs?: BitfieldConfig[];
  pollIntervalMs?: number;
  transport?: DeviceTransportConfig;
  commands?: Record<string, CommandConfig>;
}
