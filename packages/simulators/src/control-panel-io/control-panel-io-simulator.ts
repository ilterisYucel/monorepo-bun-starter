// Control Panel IO Simulator — kapı kontaktları (DI) + ışık röleleri (DO)
// (FL-07 Kapı Açık manevrasının veri kaynağı).

import { COILS, DISCRETE } from "./register-map";
import { SimulatorServer } from "../server";
import type { SimulatorNetworkConfig } from "../server";
import { ControlPanelIoAdapter } from "./control-panel-io-modbus-adapter";

interface ControlPanelIoState {
  batteryDoorOpen: boolean;
  panelDoorOpen: boolean;
  batteryLight: boolean;
  panelLight: boolean;
  fssFault: boolean;
  fssDischarged: boolean;
  fss2ndStage: boolean;
}

/** Kapı kontakt durumları girdisi — demo senaryo enjeksiyonu. */
export interface DoorStateInput {
  batteryOpen: boolean;
  panelOpen: boolean;
}

/** FSS kuru kontakt durumları girdisi (K5 — EP203 → IO DI). */
export interface FssStateInput {
  fault?: boolean;
  discharged?: boolean;
  secondStage?: boolean;
}

/**
 * ControlPanelIoSimulator — kontrol paneli dijital I/O simülatörü.
 *
 * Sözleşme (SANAL-IO-CIHAZ-AILESI-MIMARISI.md §2.3 + K5):
 * - Kapı kontaktları DI olarak okunur; başlangıçta kapalı.
 * - FSS kuru kontakları (K5): System OK = !fault && !discharged (NC),
 *   Fault/Discharged/2nd Stage ayrı DI'lar — başlangıç sağlıklı.
 * - Işık röleleri COIL olarak yazılır ve read-back yansır (komut doğrulaması).
 * - `setDoorState`/`setFssState` demo senaryo enjeksiyonudur.
 * - Bilinmeyen adres: DI false döner, COIL yazımı yok sayılır.
 */
export interface ControlPanelIoSimulatorConfig {
  /** Verilirse self-host Modbus TCP sunucusu açılır (`start()`). */
  readonly network?: SimulatorNetworkConfig;
}

export class ControlPanelIoSimulator {
  private state: ControlPanelIoState;
  private readonly network: SimulatorNetworkConfig | undefined;
  private server: SimulatorServer | undefined;

  constructor(config: ControlPanelIoSimulatorConfig = {}) {
    this.state = {
      batteryDoorOpen: false,
      panelDoorOpen: false,
      batteryLight: false,
      panelLight: false,
      fssFault: false,
      fssDischarged: false,
      fss2ndStage: false,
    };
    this.network = config.network;
  }

  /** Komut — self-host sunucu + tick açar (network yoksa no-op). Idempotent. */
  async start(): Promise<void> {
    if (this.server || this.network === undefined) return;
    this.server = new SimulatorServer({
      adapter: new ControlPanelIoAdapter(this),
      network: this.network,
      tick: (seconds) => this.tick(seconds),
    });
    await this.server.start();
  }

  /** Komut — sunucu + tick'i durdurur (idempotent). */
  async stop(): Promise<void> {
    await this.server?.stop();
    this.server = undefined;
  }

  /** Sorgu — self-host server dinlenen port (start öncesi config portu). */
  port(): number {
    return this.server?.port() ?? this.network?.port ?? 0;
  }

  /** Zaman adımı — durum sabit kalır (komut). */
  tick(_elapsedSeconds: number): void {
    // Kapı/ışık/FSS durumu yalnızca yazma/enjeksiyonla değişir
  }

  /** Demo senaryo enjeksiyonu — kapı kontakt durumları (komut). */
  setDoorState(input: DoorStateInput): void {
    this.state.batteryDoorOpen = input.batteryOpen;
    this.state.panelDoorOpen = input.panelOpen;
  }

  /** Demo senaryo enjeksiyonu — FSS kuru kontaktları (komut, K5). */
  setFssState(input: FssStateInput): void {
    if (input.fault !== undefined) this.state.fssFault = input.fault;
    if (input.discharged !== undefined) this.state.fssDischarged = input.discharged;
    if (input.secondStage !== undefined) this.state.fss2ndStage = input.secondStage;
  }

  /** Discrete input okur (sorgu). */
  readDiscreteInput(address: number): boolean {
    switch (address) {
      case DISCRETE.BATTERY_DOOR_OPEN:
        return this.state.batteryDoorOpen;
      case DISCRETE.PANEL_DOOR_OPEN:
        return this.state.panelDoorOpen;
      case DISCRETE.FSS_SYSTEM_OK:
        return !this.state.fssFault && !this.state.fssDischarged;
      case DISCRETE.FSS_FAULT:
        return this.state.fssFault;
      case DISCRETE.FSS_DISCHARGED:
        return this.state.fssDischarged;
      case DISCRETE.FSS_2ND_STAGE:
        return this.state.fss2ndStage;
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
