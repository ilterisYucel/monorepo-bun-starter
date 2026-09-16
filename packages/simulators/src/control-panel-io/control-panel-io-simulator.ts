// Control Panel IO Simulator — kapı kontaktları (DI) + ışık röleleri (DO)
// (FL-07 Kapı Açık manevrasının veri kaynağı).

import { COILS, DISCRETE } from "./register-map";

interface ControlPanelIoState {
  batteryDoorOpen: boolean;
  panelDoorOpen: boolean;
  batteryLight: boolean;
  panelLight: boolean;
}

/** Kapı kontakt durumları girdisi — demo senaryo enjeksiyonu. */
export interface DoorStateInput {
  batteryOpen: boolean;
  panelOpen: boolean;
}

/**
 * ControlPanelIoSimulator — kontrol paneli dijital I/O simülatörü.
 *
 * Sözleşme (SANAL-IO-CIHAZ-AILESI-MIMARISI.md §2.3):
 * - Kapı kontaktları DI olarak okunur; başlangıçta kapalı.
 * - Işık röleleri COIL olarak yazılır ve read-back yansır (komut doğrulaması).
 * - `setDoorState` demo senaryo enjeksiyonudur (gerçek cihazda DI donanımdan gelir).
 * - Bilinmeyen adres: DI false döner, COIL yazımı yok sayılır.
 */
export class ControlPanelIoSimulator {
  private state: ControlPanelIoState;

  constructor() {
    this.state = {
      batteryDoorOpen: false,
      panelDoorOpen: false,
      batteryLight: false,
      panelLight: false,
    };
  }

  /** Zaman adımı — durum sabit kalır (komut). */
  tick(_elapsedSeconds: number): void {
    // Kapı/ışık durumu yalnızca yazma/enjeksiyonla değişir
  }

  /** Demo senaryo enjeksiyonu — kapı kontakt durumları (komut). */
  setDoorState(input: DoorStateInput): void {
    this.state.batteryDoorOpen = input.batteryOpen;
    this.state.panelDoorOpen = input.panelOpen;
  }

  /** Discrete input okur (sorgu). */
  readDiscreteInput(address: number): boolean {
    switch (address) {
      case DISCRETE.BATTERY_DOOR_OPEN:
        return this.state.batteryDoorOpen;
      case DISCRETE.PANEL_DOOR_OPEN:
        return this.state.panelDoorOpen;
      default:
        return false;
    }
  }

  /** Coil okur (sorgu) — ışık rölesi anlık durumu. */
  readCoil(address: number): boolean {
    switch (address) {
      case COILS.BATTERY_LIGHT:
        return this.state.batteryLight;
      case COILS.PANEL_LIGHT:
        return this.state.panelLight;
      default:
        return false;
    }
  }

  /** Coil yazar (komut) — ışık rölesi konumu. */
  writeCoil(address: number, value: boolean): void {
    switch (address) {
      case COILS.BATTERY_LIGHT:
        this.state.batteryLight = value;
        break;
      case COILS.PANEL_LIGHT:
        this.state.panelLight = value;
        break;
      default:
        break;
    }
  }
}
