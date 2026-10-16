// FSS Simulator — Sigma XT yangın söndürme paneli + VIGI-DT1 gaz dedektörleri
// (SPEC DEMO-KONSOL-UI-UYUM UC-10, K-7).

import { COILS, DISCRETE, INPUT, PANEL_STATUS, ZONE_STATE } from "./register-map";
import { SimulatorServer } from "../server";
import type { SimulatorNetworkConfig } from "../server";
import { FssAdapter } from "./fss-modbus-adapter";

const ZONE_COUNT = 3;
const DETECTOR_COUNT = 2;

interface FssState {
  panelFault: boolean;
  disabled: boolean;
  test: boolean;
  /** Zone 0..2: 0 normal, 1 fire, 2 fault. */
  zones: number[];
  /** Dedektör 0..1: H₂ %LEL, VOC, RH, sıcaklık. */
  detectorLel: number[];
  detectorVoc: number[];
  detectorRh: number[];
  detectorTemp: number[];
  modeManual: boolean;
  countdown: number;
  firstStage: boolean;
  secondStage: boolean;
  released: boolean;
  extractFan: boolean;
  ventilation: boolean;
  /** Disablements (mode menu): dE/dt/dc/dP/dA/db. */
  dis: Record<"dE" | "dt" | "dc" | "dP" | "dA" | "db", boolean>;
}

/**
 * FssSimulator — yangın söndürme paneli state machine'i.
 *
 * Sözleşme (register-map.ts; referans: kablolu röle → konteyner DI):
 * - Başlangıç sağlıklı: normal, zone/dedektör normal, release yok.
 * - `injectZoneFire(zone, true)`: zone fire; 1 zone → firstStage + release
 *   countdown (releaseDelayS); ≥2 zone → secondStage. `modeManual` iken
 *   otomatik release YOK (countdown durur).
 * - `injectGasAlarm(det, true)`: H₂ ≥ alarm eşiği → tahliye + havalandırma on.
 * - `reset()`: tüm durumu sağlıklıya döndürür (panel reset komutu).
 * - Bilinmeyen adres → 0/false (hata yok).
 */
export interface FssSimulatorConfig {
  /** Verilirse self-host Modbus TCP sunucusu açılır (`start()`). */
  readonly network?: SimulatorNetworkConfig;
  /** Söndürme gecikmesi (s) — referans 30. */
  readonly releaseDelayS?: number;
  /** H₂ alarm eşiği (%LEL). */
  readonly h2AlarmLEL?: number;
}

export class FssSimulator {
  private state: FssState;
  private readonly network: SimulatorNetworkConfig | undefined;
  private readonly releaseDelayS: number;
  private readonly h2AlarmLEL: number;
  private server: SimulatorServer | undefined;

  constructor(config: FssSimulatorConfig = {}) {
    this.releaseDelayS = config.releaseDelayS ?? 30;
    this.h2AlarmLEL = config.h2AlarmLEL ?? 10;
    this.network = config.network;
    this.state = this.healthy();
  }

  private healthy(): FssState {
    return {
      panelFault: false,
      disabled: false,
      test: false,
      zones: new Array<number>(ZONE_COUNT).fill(ZONE_STATE.NORMAL),
      detectorLel: new Array<number>(DETECTOR_COUNT).fill(0),
      detectorVoc: new Array<number>(DETECTOR_COUNT).fill(0),
      detectorRh: new Array<number>(DETECTOR_COUNT).fill(45),
      detectorTemp: new Array<number>(DETECTOR_COUNT).fill(22),
      modeManual: false,
      countdown: 0,
      firstStage: false,
      secondStage: false,
      released: false,
      extractFan: false,
      ventilation: false,
      dis: { dE: false, dt: false, dc: false, dP: false, dA: false, db: false },
    };
  }

  /** Komut — self-host sunucu + tick açar (network yoksa no-op). Idempotent. */
  async start(): Promise<void> {
    if (this.server || this.network === undefined) return;
    this.server = new SimulatorServer({
      adapter: new FssAdapter(this),
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

  /** Zaman adımı — release countdown + dedektör sapması (komut). */
  tick(elapsedSeconds: number): void {
    const s = this.state;
    if (s.firstStage && !s.modeManual && !s.released) {
      s.countdown = Math.max(0, s.countdown - elapsedSeconds);
      if (s.countdown === 0) s.released = true;
    }
    const fire = s.zones.some((z) => z === ZONE_STATE.FIRE);
    for (let i = 0; i < DETECTOR_COUNT; i++) {
      if (!this.gasAlarm(i)) {
        s.detectorLel[i] = Math.max(0, s.detectorLel[i] - elapsedSeconds * 0.1);
      }
      s.detectorTemp[i] = fire ? Math.min(60, s.detectorTemp[i] + elapsedSeconds * 0.2) : 22;
    }
  }

  /** Demo enjeksiyon — zone yangını (komut). */
  injectZoneFire(zoneIndex: number, active: boolean): void {
    if (zoneIndex < 0 || zoneIndex >= ZONE_COUNT) return;
    const s = this.state;
    s.zones[zoneIndex] = active ? ZONE_STATE.FIRE : ZONE_STATE.NORMAL;
    const fires = s.zones.filter((z) => z === ZONE_STATE.FIRE).length;
    s.firstStage = fires >= 1;
    s.secondStage = fires >= 2;
    if (s.firstStage && !s.released) s.countdown = this.releaseDelayS;
    if (!s.firstStage) {
      s.countdown = 0;
      s.released = false;
    }
  }

  /** Demo enjeksiyon — H₂ gaz alarmı (komut). */
  injectGasAlarm(detectorIndex: number, active: boolean): void {
    if (detectorIndex < 0 || detectorIndex >= DETECTOR_COUNT) return;
    this.state.detectorLel[detectorIndex] = active ? this.h2AlarmLEL + 5 : 0;
    const anyGas = this.gasAlarm(0) || this.gasAlarm(1);
    this.state.extractFan = anyGas;
    this.state.ventilation = anyGas;
  }

  /** Demo enjeksiyon — panel arızası (komut). */
  setPanelFault(active: boolean): void {
    this.state.panelFault = active;
  }

  /** Demo enjeksiyon — disablement (mode menu) ayarı (komut). */
  setDisablement(key: keyof FssState["dis"], active: boolean): void {
    this.state.dis[key] = active;
  }

  /** Demo enjeksiyon — devre dışı / test (komut). */
  setPanelMode(mode: "normal" | "disabled" | "test"): void {
    this.state.disabled = mode === "disabled";
    this.state.test = mode === "test";
  }

  /** Panel reset — sağlıklıya döner (komut). */
  reset(): void {
    this.state = this.healthy();
  }

  private gasAlarm(i: number): boolean {
    return this.state.detectorLel[i] >= this.h2AlarmLEL;
  }

  private status(): number {
    const s = this.state;
    if (s.released || s.firstStage) return PANEL_STATUS.FIRE;
    if (s.panelFault) return PANEL_STATUS.FAULT;
    if (s.disabled) return PANEL_STATUS.DISABLED;
    if (s.test) return PANEL_STATUS.TEST;
    return PANEL_STATUS.NORMAL;
  }

  /** Input register okur (sorgu). */
  readInputRegister(address: number): number {
    const s = this.state;
    switch (address) {
      case INPUT.PANEL_STATUS:
        return this.status();
      case INPUT.FIRST_STAGE:
        return s.firstStage ? 1 : 0;
      case INPUT.SECOND_STAGE:
        return s.secondStage ? 1 : 0;
      case INPUT.RELEASED:
        return s.released ? 1 : 0;
      case INPUT.COUNTDOWN:
        return s.countdown;
      case INPUT.MODE:
        return s.modeManual ? 1 : 0;
      case INPUT.ZONE_1_STATE:
        return s.zones[0] ?? 0;
      case INPUT.ZONE_2_STATE:
        return s.zones[1] ?? 0;
      case INPUT.ZONE_3_STATE:
        return s.zones[2] ?? 0;
      case INPUT.DET1_H2_LEL:
        return Math.round(s.detectorLel[0] * 10);
      case INPUT.DET1_VOC:
        return Math.round(s.detectorVoc[0] * 10);
      case INPUT.DET1_RH:
        return Math.round(s.detectorRh[0]);
      case INPUT.DET1_TEMP:
        return Math.round(s.detectorTemp[0] * 10);
      case INPUT.DET2_H2_LEL:
        return Math.round(s.detectorLel[1] * 10);
      case INPUT.DET2_VOC:
        return Math.round(s.detectorVoc[1] * 10);
      case INPUT.DET2_RH:
        return Math.round(s.detectorRh[1]);
      case INPUT.DET2_TEMP:
        return Math.round(s.detectorTemp[1] * 10);
      case INPUT.EXTRACT_FAN:
        return s.extractFan ? 1 : 0;
      case INPUT.VENTILATION:
        return s.ventilation ? 1 : 0;
      case INPUT.BUZZER:
        return s.firstStage ? 1 : 0;
      case INPUT.VENTS_OPEN:
        return s.released ? 1 : 0;
      case INPUT.DISABLE_EXTRACT:
        return s.dis.dE ? 1 : 0;
      case INPUT.DISABLE_MANUAL:
        return s.dis.dt ? 1 : 0;
      case INPUT.DISABLE_EXTRACT_FAN:
        return s.dis.dc ? 1 : 0;
      case INPUT.DISABLE_STAGE1:
        return s.dis.dP ? 1 : 0;
      case INPUT.DISABLE_STAGE2:
        return s.dis.dA ? 1 : 0;
      case INPUT.DISABLE_SOUNDERS:
        return s.dis.db ? 1 : 0;
      default:
        return 0;
    }
  }

  /** Coil okur / yazar (komut). */
  readCoil(address: number): boolean {
    const s = this.state;
    switch (address) {
      case COILS.MODE_MANUAL:
        return s.modeManual;
      case COILS.EXTRACT_FAN:
        return s.extractFan;
      case COILS.VENTILATION:
        return s.ventilation;
      default:
        return false;
    }
  }

  writeCoil(address: number, value: boolean): void {
    const s = this.state;
    switch (address) {
      case COILS.RESET:
        if (value) this.reset();
        break;
      case COILS.MODE_MANUAL:
        s.modeManual = value;
        break;
      case COILS.EXTRACT_FAN:
        s.extractFan = value;
        break;
      case COILS.VENTILATION:
        s.ventilation = value;
        break;
      default:
        break;
    }
  }

  /** Discrete input okur — kuru kontak teyidi (sorgu). */
  readDiscreteInput(address: number): boolean {
    const s = this.state;
    switch (address) {
      case DISCRETE.SYSTEM_OK:
        return !s.panelFault && !s.released;
      case DISCRETE.FAULT:
        return s.panelFault;
      case DISCRETE.DISCHARGED:
        return s.released;
      case DISCRETE.SECOND_STAGE:
        return s.secondStage;
      default:
        return false;
    }
  }
}
