// FSS Simulator — Fire Suppression System (FL-01/FL-06 availability önkoşulu).

import { DISCRETE } from "./register-map";

interface FssState {
  fault: boolean;
  discharged: boolean;
}

/**
 * FssSimulator — yangın söndürme sistemi durum simülatörü.
 *
 * Sözleşme (SANAL-IO-CIHAZ-AILESI-MIMARISI.md §2.2):
 * - Başlangıç durumu sağlıklı: System OK=true, Fault=false, Discharged=false.
 * - `setFault(true)` demo senaryo enjeksiyonu: Fault=true, System OK=false.
 * - `setDischarged(true)`: söndürme aktive durumu.
 * - Bilinmeyen adres → false.
 */
export class FssSimulator {
  private state: FssState;

  constructor() {
    this.state = { fault: false, discharged: false };
  }

  /** Zaman adımı — durum sabit kalır (komut). */
  tick(_elapsedSeconds: number): void {
    // FSS durumu yalnızca senaryo enjeksiyonuyla değişir
  }

  /** Demo senaryo enjeksiyonu — arıza aktif/pasif (komut). */
  setFault(active: boolean): void {
    this.state.fault = active;
  }

  /** Demo senaryo enjeksiyonu — söndürme aktive durumu (komut). */
  setDischarged(active: boolean): void {
    this.state.discharged = active;
  }

  /** Discrete input okur (sorgu). */
  readDiscreteInput(address: number): boolean {
    switch (address) {
      case DISCRETE.SYSTEM_OK:
        return !this.state.fault && !this.state.discharged;
      case DISCRETE.FAULT:
        return this.state.fault;
      case DISCRETE.DISCHARGED:
        return this.state.discharged;
      default:
        return false;
    }
  }
}
