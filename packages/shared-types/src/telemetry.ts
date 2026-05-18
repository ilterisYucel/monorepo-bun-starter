/**
 * Byte Order (Endianness) tipleri
 * - BIG_ENDIAN: Motorola sırası, en anlamlı byte ilk (ABCD)
 * - LITTLE_ENDIAN: Intel sırası, en az anlamlı byte ilk (DCBA)
 * - BIG_ENDIAN_SWAP: Word'ler swap edilmiş (BADC)
 * - LITTLE_ENDIAN_SWAP: Word'ler swap edilmiş little endian (CDAB)
 */
export type ByteOrder =
  | "BIG_ENDIAN"
  | "LITTLE_ENDIAN"
  | "BIG_ENDIAN_SWAP"
  | "LITTLE_ENDIAN_SWAP";

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
  registerDataType:
    | "BOOL"
    | "INT16"
    | "UINT16"
    | "INT32"
    | "UINT32"
    | "FLOAT32"
    | "FLOAT64";
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
 * TimescaleDB / InfluxDB için telemetry verisi
 * Zaman serisi veritabanlarına yazılacak veriler için kullanılır
 */
export interface TimescaleDbData extends BaseTelemetryData {
  /** Veritabanı tipi */
  protocol: "TIMESCALEDB" | "INFLUXDB";
  /** Verinin yazılacağı tablo adı (örn: "voltages", "currents") */
  tableName: string;
}

// ============================================
// DOMAIN BAZLI TİPLER
// ============================================

/**
 * Jenerik telemetry verisi
 * Önceden tanımlanmamış herhangi bir veri için kullanılır
 * (örn: güneş panelinin yıllık üretimi, rüzgar hızı, basınç)
 */
export interface GenericTelemetryData extends BaseTelemetryData {
  /** Verinin adı - herhangi bir string olabilir */
  name: string;
  /** Birim - herhangi bir string olabilir */
  unit: string;
  /** Değer - sayı, boolean veya metin olabilir */
  value: number | boolean | string;
}

/** Voltaj ölçümü için tip güvenli interface */
export interface VoltageData extends BaseTelemetryData {
  name: "Voltage";
  unit: "V" | "mV" | "kV";
  value: number;
}

/** Akım ölçümü için tip güvenli interface */
export interface CurrentData extends BaseTelemetryData {
  name: "Current";
  unit: "A" | "mA" | "kA";
  value: number;
}

/** Güç ölçümü için tip güvenli interface */
export interface PowerData extends BaseTelemetryData {
  name: "Power";
  unit: "W" | "kW" | "MW";
  value: number;
}

/** Sıcaklık ölçümü için tip güvenli interface */
export interface TemperatureData extends BaseTelemetryData {
  name: "Temperature";
  unit: "°C" | "°F" | "K";
  value: number;
}

/** Şarj durumu (State of Charge) için tip güvenli interface */
export interface StateOfChargeData extends BaseTelemetryData {
  name: "SoC";
  unit: "%";
  value: number;
}

/** Sağlık durumu (State of Health) için tip güvenli interface */
export interface StateOfHealthData extends BaseTelemetryData {
  name: "SoH";
  unit: "%";
  value: number;
}

/** Şarj/Deşarj durumu için tip güvenli interface */
export interface ChargeStatusData extends BaseTelemetryData {
  name: "ChargeStatus";
  unit: "";
  value: "Charge" | "Discharge" | "Idle";
}

// ============================================
// BİRLEŞTİRİCİ TİPLER
// ============================================

/**
 * Tüm telemetry verilerini kapsayan union tip
 * Frontend ↔ Backend API iletişiminde kullanılır
 * Generic + Domain tiplerinin hepsini içerir
 */
export type TelemetryData =
  | GenericTelemetryData
  | VoltageData
  | CurrentData
  | PowerData
  | TemperatureData
  | StateOfChargeData
  | StateOfHealthData
  | ChargeStatusData;

/**
 * Protokol bazlı telemetry verilerini kapsayan union tip
 * Backend ↔ Driver katmanı arasında kullanılır
 * Modbus, CANbus, MQTT ve veritabanı tiplerini içerir
 */
export type TelemetryDataWithProtocol =
  | ModbusTelemetryData
  | CanbusTelemetryData
  | MqttTelemetryData
  | TimescaleDbData;

// ============================================
// CİHAZ TANIMLAMA
// ============================================

/**
 * Fiziksel veya sanal cihaz tanımı
 * Device Registry'de tutulur
 */
export interface Device {
  /** Cihazın benzersiz kimliği */
  id: string;
  /** Cihazın görünen adı */
  name: string;
  /** Üretici firma adı */
  manufacturer: string;
  /** Cihaz model numarası */
  model: string;
  /** Kullandığı iletişim protokolü */
  protocol: "MODBUS" | "CANBUS" | "MQTT" | "SIMULATOR";
  /** Protokole özel bağlantı parametreleri (IP, port, baudrate, topic, vs.) */
  connectionParams: Record<string, unknown>;
  /** Hangi telemetry verilerinin hangi protokol bilgileriyle okunacağının haritası */
  telemetryMap: TelemetryMapping[];
}

/**
 * Telemetry verisi ile protokol bilgisi arasındaki eşleme
 * Bir cihazın "Voltage" verisini hangi register'dan okuyacağını belirtir
 */
export interface TelemetryMapping {
  /** Telemetry verisinin adı (örn: "Voltage", "Current") */
  telemetryName: string;
  /** Protokole özel bilgiler (registerAddress, canId, topic, vs.) */
  protocolSpecific: Omit<
    ModbusTelemetryData | CanbusTelemetryData | MqttTelemetryData,
    keyof BaseTelemetryData
  >;
}

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

/**
 * Bir cihaza gönderilen komut için standart format
 * Frontend'den Backend'e, Backend'den Driver'a komut iletiminde kullanılır
 * @template T Komut payload tipi
 */
export interface CommandRequest<T = unknown> {
  /** Benzersiz komut kimliği (UUID) */
  commandId: string;
  /** Hedef cihaz kimliği */
  deviceId: string;
  /** Komut tipi: WRITE (yaz), READ (oku), EXECUTE (çalıştır) */
  command: "WRITE" | "READ" | "EXECUTE";
  /** Komutun içeriği (tipi cihaza göre değişir) */
  payload: T;
  /** Komut önceliği: 0 en yüksek, 3 en düşük */
  priority: number;
  /** Komut oluşturulma zamanı */
  timestamp: string;
}

/**
 * Gönderilen komuta verilen cevap formatı
 */
export interface CommandResponse {
  /** Cevap verilen komutun kimliği */
  commandId: string;
  /** Komut durumu */
  status: "SUCCESS" | "FAILED" | "PENDING";
  /** Başarılı durumda dönen veri (opsiyonel) */
  result?: unknown;
  /** Hata durumunda hata mesajı (opsiyonel) */
  error?: string;
  /** Cevap zamanı */
  timestamp: string;
}

// ============================================
// FRONTEND İÇİN
// ============================================

/**
 * Frontend'in direkt tüketebileceği normalize edilmiş telemetry verisi
 * API'den Frontend'e dönen response'larda ve Frontend state'inde kullanılır
 * UI bileşenleri bu formatı doğrudan render edebilir
 */
export interface NormalizedTelemetry {
  /** Benzersiz anahtar: deviceId + name kombinasyonu (örn: "inverter-1-Voltage") */
  id: string;
  /** Cihaz kimliği */
  deviceId: string;
  /** Cihazın görünen adı */
  deviceName: string;
  /** Ölçüm adı (örn: "Voltage", "Current") */
  name: string;
  /** Ölçüm değeri */
  value: number | string | boolean;
  /** Ölçüm birimi */
  unit: string;
  /** Ölçüm zamanı */
  timestamp: string;
}
