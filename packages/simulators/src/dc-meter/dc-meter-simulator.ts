// DC Metre Simülatörü — DJSF1352-RN (FL-08 DC kısa devre koruması kaynağı).

import { INPUT } from "./register-map";

/** float32 → BE kelime çifti (Modbus register çifti kodlaması). */
function floatToWords(value: number): [number, number] {
  const buf = new ArrayBuffer(4);
  const view = new DataView(buf);
  view.setFloat32(0, value, false); // big-endian
  return [view.getUint16(0), view.getUint16(2)];
}

/**
 * DcMeterSimulator — salt ölçüm DC metre simülatörü.
 *
 * Sözleşme (KONTEYNER-MANEVRA-KATALOGU-REV03 §2.6, register-map.ts):
 * - Başlangıç nominal: 750.0 V · 100.0 A · 75.0 kW · Alarm Word 0.
 * - `setMeasurements()` senaryo enjeksiyonu (FL-08 eşik testleri): yalnızca
 *   verilen alanlar değişir, diğerleri korunur (komut).
 * - `tick()` etkisizdir — değerler deterministik kalır (salt okuma cihazı).
 * - Bilinmeyen adres → 0.
 */
export class DcMeterSimulator {
  private voltage = 750.0;
  private current = 100.0;
  private power = 75.0;
  private alarmWord = 0;

  /** Zaman adımı — etkisiz: ölçümler deterministik kalır (sorgu değil, komut boş). */
  tick(_elapsedSeconds: number): void {
    // Salt ölçüm cihazı — zamanla değişen davranış YOKTUR.
  }

  /** Senaryo enjeksiyonu — verilen alanları günceller; diğerleri korunur (komut). */
  setMeasurements(values: {
    voltage?: number;
    current?: number;
    power?: number;
    alarmWord?: number;
  }): void {
    if (values.voltage !== undefined) this.voltage = values.voltage;
    if (values.current !== undefined) this.current = values.current;
    if (values.power !== undefined) this.power = values.power;
    if (values.alarmWord !== undefined) this.alarmWord = values.alarmWord;
  }

  /** Input register okur — kelime bazlı (FLOAT32 çiftleri BE) (sorgu). */
  readInputRegister(address: number): number {
    switch (address) {
      case INPUT.ALARM_WORD:
        return this.alarmWord;
      case INPUT.DC_VOLTAGE:
        return floatToWords(this.voltage)[0];
      case INPUT.DC_VOLTAGE + 1:
        return floatToWords(this.voltage)[1];
      case INPUT.DC_CURRENT:
        return floatToWords(this.current)[0];
      case INPUT.DC_CURRENT + 1:
        return floatToWords(this.current)[1];
      case INPUT.DC_POWER:
        return floatToWords(this.power)[0];
      case INPUT.DC_POWER + 1:
        return floatToWords(this.power)[1];
      default:
        return 0;
    }
  }
}
