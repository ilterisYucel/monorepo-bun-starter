// AUX Analyser Simulator — AUX enerji durumu (FL-02 AUX Kaybı).

import { INPUT } from "./register-map";

const randomFloat = (): number => {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0]! / 0xFFFFFFFF;
};

interface AuxState {
  voltage: number; // 0.1 ölçek (2300 → 230.0V)
  current: number; // 0.1 ölçek (A)
  frequency: number; // 0.01 ölçek (5000 → 50.00Hz)
  energyLoss: boolean;
}

const NOMINAL_VOLTAGE = 2300;
const NOMINAL_CURRENT = 120; // 12.0A
const NOMINAL_FREQUENCY = 5000;

/**
 * AuxAnalyserSimulator — AUX besleme enerji analizörü simülatörü.
 *
 * Sözleşme (SANAL-IO-CIHAZ-AILESI-MIMARISI.md §2.1):
 * - Başlangıç durumu: AUX OK (Energy Status bit0=1).
 * - Nominal değerler civarında küçük jitter üretir.
 * - `setEnergyLoss(true)` demo senaryo enjeksiyonu: bit1 set olur, voltaj 0'a
 *   düşer (gerçek cihazda bu durum donanımdan gelir).
 * - Bilinmeyen adres → 0.
 */
export class AuxAnalyserSimulator {
  private state: AuxState;

  constructor() {
    this.state = {
      voltage: NOMINAL_VOLTAGE,
      current: NOMINAL_CURRENT,
      frequency: NOMINAL_FREQUENCY,
      energyLoss: false,
    };
  }

  /** Zaman adımı — nominal bant içinde jitter üretir (komut). */
  tick(_elapsedSeconds: number): void {
    const s = this.state;
    if (s.energyLoss) {
      s.voltage = 0;
      s.current = 0;
      s.frequency = 0;
      return;
    }
    s.voltage = NOMINAL_VOLTAGE + Math.round((randomFloat() - 0.5) * 40);
    s.current = NOMINAL_CURRENT + Math.round((randomFloat() - 0.5) * 10);
    s.frequency = NOMINAL_FREQUENCY + Math.round((randomFloat() - 0.5) * 20);
  }

  /** Demo senaryo enjeksiyonu — AUX kaybı aktif/pasif (komut). */
  setEnergyLoss(active: boolean): void {
    this.state.energyLoss = active;
  }

  /** Input register okur (sorgu). */
  readInputRegister(address: number): number {
    const s = this.state;
    switch (address) {
      case INPUT.AUX_VOLTAGE:
        return s.voltage;
      case INPUT.AUX_CURRENT:
        return s.current;
      case INPUT.AUX_FREQUENCY:
        return s.frequency;
      case INPUT.ENERGY_STATUS: {
        let status = 0;
        if (!s.energyLoss) status |= 0x0001;
        if (s.energyLoss) status |= 0x0002;
        return status;
      }
      default:
        return 0;
    }
  }
}
