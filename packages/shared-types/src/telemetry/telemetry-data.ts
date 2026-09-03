// Telemetri veri tipleri — tüm sistemin ortak veri sözleşmesi.
// Frontend ↔ Backend ↔ Driver katmanları arasında taşınan tek şekildir.

import type { ByteOrder } from "../modbus/modbus-types";

/** Batarya şarj/deşarj/boşta durumu */
export type ChargeStatus = "Charge" | "Discharge" | "Idle";

/** Register içindeki verinin tipi (Modbus) */
export type RegisterDataType =
  | "BOOL"
  | "INT16"
  | "UINT16"
  | "INT32"
  | "UINT32"
  | "FLOAT32"
  | "FLOAT64";

/**
 * Tüm telemetry verilerinin temel interface'i
 * Her telemetry verisi bu alanları içermek zorundadır
 */
export interface BaseTelemetryData {
  /** Verinin adı: "Voltage", "Current", "Power", "Temperature" */
  name: string;
  /** İnsan tarafından okunabilir açıklama */
  description: string;
  /** Ölçüm değeri (sayı, boolean veya metin olabilir) */
  value: number | boolean | string;
  /** Ölçüm birimi: "V", "A", "kW", "°C", "Hz", "%" */
  unit: string;
  /** ISO 8601 formatında zaman damgası */
  timestamp: string;
  /** Veriyi üreten cihazın benzersiz kimliği */
  deviceId: string;
  // rack_id, sensor_id, vs.
  tags?: Record<string, string>;
}

/**
 * Tüm telemetry verilerini kapsayan tip.
 * Frontend ↔ Backend API iletişiminde kullanılır.
 */
export type TelemetryData = BaseTelemetryData;

// ============================================
// PROTOKOL BAZLI TİPLER
// ============================================

/**
 * Modbus protokolüne özel telemetry verisi
 * Modbus cihazlarından okunan veya yazılan veriler için kullanılır
 */
export interface ModbusTelemetryData extends BaseTelemetryData {
  /** Protokol adı - sabit */
  protocol: "MODBUS";
  /** Modbus register adresi (40001, 4400 gibi) */
  registerAddress: number;
  /**
   * Register tablo tipi
   * - COIL: 1-bit okuma/yazma
   * - DISCRETE_INPUT: 1-bit sadece okuma
   * - INPUT_REGISTER: 16-bit sadece okuma
   * - HOLDING_REGISTER: 16-bit okuma/yazma
   */
  registerTableType:
    | "COIL"
    | "DISCRETE_INPUT"
    | "INPUT_REGISTER"
    | "HOLDING_REGISTER";
  /** Register içindeki verinin tipi */
  registerDataType: RegisterDataType;
  /** Ham değeri gerçek değere çevirmek için çarpan (value = raw * scale + offset) */
  scale: number;
  /** Ham değere eklenecek kayma (value = raw * scale + offset) */
  offset: number;
  /** Yazma önceliği: 0 en yüksek, 3 en düşük */
  priority: number;
  /** Modbus ağındaki cihaz ID'si (1-247) - isteğe bağlı */
  slaveId?: number;
  /** Çok baytlı verilerde byte sıralaması */
  byteOrder: ByteOrder;
}

/**
 * CANbus protokolüne özel telemetry verisi
 * CANbus cihazlarından okunan veriler için kullanılır
 */
export interface CanbusTelemetryData extends BaseTelemetryData {
  /** Protokol adı - sabit */
  protocol: "CANBUS";
  /** CAN mesaj ID'si (11-bit veya 29-bit) */
  canId: number;
  /** 29-bit extended ID mi? (false = 11-bit standard) */
  isExtendedId: boolean;
  /** CAN data bytes içinde verinin başladığı bit pozisyonu (0-63) */
  startBit: number;
  /** Kaç bitlik veri okunacağı (1-64) */
  length: number;
  /** Ham değeri gerçek değere çevirmek için çarpan */
  scale: number;
  /** Ham değere eklenecek kayma */
  offset: number;
  /** Byte sıralaması */
  byteOrder: ByteOrder;
  /** Yazma önceliği: 0 en yüksek, 3 en düşük */
  priority: number;
}

/**
 * MQTT protokolüne özel telemetry verisi
 * MQTT broker üzerinden yayınlanan veya alınan veriler için kullanılır
 */
export interface MqttTelemetryData extends BaseTelemetryData {
  /** Protokol adı - sabit */
  protocol: "MQTT";
  /** MQTT topic adresi (örn: "sensors/battery/voltage") */
  topic: string;
  /**
   * Quality of Service seviyesi
   * - 0: En fazla bir (fire and forget)
   * - 1: En az bir (acknowledged)
   * - 2: Tam bir (exactly once)
   */
  qos: 0 | 1 | 2;
  /** Broker son mesajı tutsun mu? Yeni subscriber'a hemen gönderilsin mi? */
  retain: boolean;
  /** Payload formatı */
  payloadType: "JSON" | "RAW" | "PROTOBUF";
  /** JSON payload içinde değerin yolu (örn: "data.voltage.value") */
  jsonPath?: string;
  /** Yazma önceliği: 0 en yüksek, 3 en düşük */
  priority: number;
}

/**
 * Protokol bazlı telemetry verilerini kapsayan union tip
 * Backend ↔ Driver katmanı arasında kullanılır
 */
export type TelemetryDataWithProtocol =
  | ModbusTelemetryData
  | CanbusTelemetryData
  | MqttTelemetryData;

// ============================================
// KOMPOZİT VERİ YAPILARI
// ============================================

/**
 * Aynı cihazdan gelen birden fazla telemetry verisini toplu taşımak için
 * Toplu okuma/yazma işlemlerinde kullanılır
 */
export interface BatchTelemetryData {
  /** Cihaz kimliği */
  deviceId: string;
  /** Toplu ölçüm zamanı */
  timestamp: string;
  /** Ölçüm noktaları listesi */
  dataPoints: TelemetryData[];
}
