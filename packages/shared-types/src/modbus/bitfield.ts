// Bit-bazlı register konfigürasyonu — Modbus alarm/status register'ları için.

/**
 * Alarm ve durum register'ları için bit-alan tanımı.
 * BSC BMS gibi cihazlarda, tek bir register içindeki her bit
 * farklı bir alarm/uyarı/durum sinyalidir.
 */
export interface BitfieldField {
  /** Bit başlangıcı (0-15) */
  bitStart: number;
  /** Bit bitişi (bitStart ile aynı olabilir - tek bit) */
  bitEnd: number;
  /** Telemetry veri adı (örn: "bsc1_alarm") */
  name: string;
  /** Veri etiketi (örn: "bsc1_alarm_flag") */
  dataTag: string;
  /** İnsan tarafından okunabilir açıklama */
  description: string;
  /** Değer 0 olduğunda gösterilecek etiket (opsiyonel) */
  label0?: string;
  /** Değer 1 olduğunda gösterilecek etiket (opsiyonel) */
  label1?: string;
  /** Ölçüm birimi */
  unit: string;
  /** Ham değer çarpan (varsayılan: 1) */
  scale?: number;
  /** Ham değer kayma (varsayılan: 0) */
  offset?: number;
  /** Alarm seviyesi (opsiyonel) */
  alarmLimit?: string;
  /** Bu bitfield değeri sistem log kaydı olarak da yazılsın mı? */
  logType?: "error" | "warning" | "info";
  /** TelemetryData.tags'a eklenecek etiketler (örn: { rack_id: "3" }) */
  tags?: Record<string, string>;
}

/**
 * Bit-alan register konfigürasyonu.
 * Bir register adresine karşılık gelen tüm bit alanlarını tanımlar.
 * Tek bir register okumasıyla N adet TelemetryData üretilir.
 */
export interface BitfieldConfig {
  /** Modbus register adresi */
  registerAddress: number;
  /** Register tablo tipi */
  registerType: "INPUT_REGISTER" | "HOLDING_REGISTER";
  /** Bu register içindeki bit alanları */
  fields: BitfieldField[];
  /** Bu register'daki tüm field'lara eklenecek etiketler (örn: { rack_id: "3" }) */
  tags?: Record<string, string>;
}
