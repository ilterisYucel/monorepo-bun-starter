// IMD Simulator — Insulation Monitoring Device (FL-11 toprak direnci hatası).

import { INPUT } from "./register-map";

const randomFloat = (): number => {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0]! / 0xFFFFFFFF;
};

interface ImdState {
  resistance: number; // kΩ
  fault: boolean;
}

const HEALTHY_RESISTANCE = 1000;

/**
 * ImdSimulator — izolasyon izleme cihazı simülatörü.
 *
 * Sözleşme (SANAL-IO-CIHAZ-AILESI-MIMARISI.md §2.4):
 * - Başlangıç durumu sağlıklı: Status bit0=1 (OK), direnç ~1000 kΩ.
 * - `setFault(true)` demo senaryo enjeksiyonu: Status bit1 set, bit0 temiz,
 *   izolasyon direnci eşik altına (500 kΩ altı) düşer.
 * - Bilinmeyen adres → 0.
 */
export class ImdSimulator {
  private state: ImdState;

  constructor() {
    this.state = { resistance: HEALTHY_RESISTANCE, fault: false };
  }

  /** Zaman adımı — jitter üretir; fault'ta direnci düşük tutar (komut). */
  tick(_elapsedSeconds: number): void {
    const s = this.state;
    if (s.fault) {
      s.resistance = Math.round(randomFloat() * 200);
      return;
    }
    s.resistance = HEALTHY_RESISTANCE + Math.round((randomFloat() - 0.5) * 100);
  }

  /** Demo senaryo enjeksiyonu — izolasyon arızası aktif/pasif (komut). */
  setFault(active: boolean): void {
    this.state.fault = active;
  }

  /** Input register okur (sorgu). */
  readInputRegister(address: number): number {
    const s = this.state;
    switch (address) {
      case INPUT.INSULATION_RESISTANCE:
        return s.resistance;
      case INPUT.STATUS: {
        let status = 0;
        if (!s.fault) status |= 0x0001;
        if (s.fault) status |= 0x0002;
        return status;
      }
      default:
        return 0;
    }
  }
}
