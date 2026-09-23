// IMD Simulator — isoPV1685RTU (FL-11 toprak direnci hatası) — K4 gerçek map.

import { INPUT } from "./register-map";

const randomFloat = (): number => {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0]! / 0xFFFFFFFF;
};

const u32hi = (v: number): number => (v >>> 16) & 0xffff;
const u32lo = (v: number): number => v & 0xffff;

interface ImdState {
  resistance: number; // Ω
  prewarning: boolean;
  alarm: boolean;
  deviceError: number; // 0 yok · >0 hata kodu
}

const HEALTHY_RESISTANCE = 1_000_000; // 1 MΩ
const OK = 0;
const WARNING = 4;

/**
 * ImdSimulator — izolasyon izleme cihazı simülatörü (gerçek map — K4).
 *
 * Sözleşme (register-map.ts, isoPV1685RTU_D00007_A_XXEN §3):
 * - Başlangıç sağlıklı: direnç ~1 MΩ, Alarm/Prewarning 0, Device Error 0.
 * - `setFault(true)`: Alarm + Prewarning = 4 (Warning), direnç 100 kΩ altına
 *   düşer (FL-11 senaryosu).
 * - `setDeviceError(code)`: Device Error register'ı (0 temizler).
 * - Direnç UInt32 (2 kelime BE): okuma adres çiftiyle kelime kelime yapılır.
 * - Bilinmeyen adres → 0.
 */
export class ImdSimulator {
  private state: ImdState;

  constructor() {
    this.state = {
      resistance: HEALTHY_RESISTANCE,
      prewarning: false,
      alarm: false,
      deviceError: 0,
    };
  }

  /** Zaman adımı — jitter üretir; fault'ta direnci düşük tutar (komut). */
  tick(_elapsedSeconds: number): void {
    const s = this.state;
    if (s.alarm) {
      s.resistance = Math.round(randomFloat() * 80_000) + 10_000;
      return;
    }
    s.resistance = HEALTHY_RESISTANCE + Math.round((randomFloat() - 0.5) * 100_000);
  }

  /** İzolasyon arızası enjeksiyonu — FL-11 senaryosu (komut). */
  setFault(active: boolean): void {
    this.state.prewarning = active;
    this.state.alarm = active;
    if (!active) {
      this.state.resistance = HEALTHY_RESISTANCE;
    }
  }

  /** Cihaz hatası enjeksiyonu — Device Error kodu (komut). */
  setDeviceError(code: number): void {
    this.state.deviceError = code;
  }

  /** Input register okur — kelime bazlı (UInt32 çifti BE) (sorgu). */
  readInputRegister(address: number): number {
    const s = this.state;
    switch (address) {
      case INPUT.INSULATION_RESISTANCE:
        return u32hi(s.resistance);
      case INPUT.INSULATION_RESISTANCE + 1:
        return u32lo(s.resistance);
      case INPUT.PREWARNING:
        return s.prewarning ? WARNING : OK;
      case INPUT.ALARM:
        return s.alarm ? WARNING : OK;
      case INPUT.DEVICE_ERROR:
        return s.deviceError;
      default:
        return 0;
    }
  }
}
