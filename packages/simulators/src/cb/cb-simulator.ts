// CB Simülatörü — DC Şalter (SYW6GZ-4000) — K2 rework.

import { COILS, DISCRETE } from "./register-map";

interface CbState {
  closed: boolean;
  pendingOpen: boolean;
  pendingClose: boolean;
}

/**
 * CbSimulator — DC şalter simülatörü (K2: kesici → şalter modeli).
 *
 * Sözleşme (register-map.ts):
 * - Başlangıç kapalı: Is Closed = true, Is Open = false.
 * - COIL 0 (shunt trip) / COIL 1 (closing coil) darbeleri `tick`'te uygulanır
 *   (yazım anında DEĞİL — validate read-back tick'ten sonra doğru görür).
 * - Trip/akım/sıcaklık/eşik/reset semantiği YOKTUR; input/holding okumaları 0.
 * - Bilinmeyen adres → 0/false (yok say).
 */
export class CbSimulator {
  private state: CbState;

  constructor() {
    this.state = { closed: true, pendingOpen: false, pendingClose: false };
  }

  /** Zaman adımı — bekleyen coil darbelerini uygular (komut). */
  tick(_elapsedSeconds: number): void {
    const s = this.state;

    if (s.pendingOpen) {
      s.pendingOpen = false;
      if (s.closed) s.closed = false;
    }

    if (s.pendingClose) {
      s.pendingClose = false;
      if (!s.closed) s.closed = true;
    }
  }

  /** Input register okur — şalterde yoktur, hep 0 (sorgu). */
  readInputRegister(_address: number): number {
    return 0;
  }

  /** Holding register okur — şalterde yoktur, hep 0 (sorgu). */
  readHoldingRegister(_address: number): number {
    return 0;
  }

  /** Holding register yazımı — şalterde yoktur, yok sayılır (komut). */
  writeHoldingRegister(_address: number, _value: number): void {
    // Şalterde holding register YOKTUR.
  }

  /** Coil okur — bekleyen komut darbesi (sorgu). */
  readCoil(address: number): boolean {
    switch (address) {
      case COILS.OPEN:
        return this.state.pendingOpen;
      case COILS.CLOSE:
        return this.state.pendingClose;
      default:
        return false;
    }
  }

  /** Coil yazar — OPEN/CLOSE darbesi işaretler; false yok sayılır (komut). */
  writeCoil(address: number, value: boolean): void {
    if (!value) return;

    switch (address) {
      case COILS.OPEN:
        this.state.pendingOpen = true;
        break;
      case COILS.CLOSE:
        this.state.pendingClose = true;
        break;
      default:
        break;
    }
  }

  /** Aux kontak durumu okur — DI 0 Is Closed (NC), DI 1 Is Open (NO) (sorgu). */
  readDiscreteInput(address: number): boolean {
    switch (address) {
      case DISCRETE.IS_CLOSED:
        return this.state.closed;
      case DISCRETE.IS_OPEN:
        return !this.state.closed;
      default:
        return false;
    }
  }
}
