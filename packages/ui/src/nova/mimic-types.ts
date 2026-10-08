/**
 * NOVA mimic — paylaşımlı tip sözleşmeleri (SPEC K2/K5, UC-2/UC-3).
 *
 * Framework'suz SVG fabrikası (`createNovaMimic`) ve demo veri eşleme katmanı
 * aynı sözleşmeyi paylaşır. Topoloji siteye özgüdür (app'te tanımlanır); state
 * her tarama döngüsünde bu şekle dönüştürülür.
 */

export type NovaSwitchPos = "closed" | "open" | "tripped";

export interface NovaCellConfig {
  id: string;
  label: string;
  kind: "cb" | "lbs" | "vt";
  role: string;
  feeder?: "A" | "B";
  /** Motorlu kumanda mekanizması (uzaktan açma/kapama). */
  motor?: boolean;
  /** Kablo tarafı toprak ayırıcısı. */
  es?: boolean;
  /** Toprak ayırıcı motorlu mu (uzaktan kumanda). */
  esMotor?: boolean;
  /** İç ihtiyaç (AUX) trafosu bu hücreden beslenir (H02). */
  auxTr?: boolean;
  ct?: string;
  vt?: string;
  ctPrimary?: number;
}

export interface NovaStationConfig {
  name: string;
  rating: string;
  busLabel: string;
  nominalKV: number;
  poiLabel: string;
  poiCable: string;
  cells: NovaCellConfig[];
}

export interface NovaRmuCellConfig {
  id: string;
  label: string;
  kind: "lbs" | "cb" | "es";
  /** Motorlu kumanda mekanizması. */
  motor?: boolean;
}

/** Konteyner DC bara/koruma künyesi (UC-4 SCADA). */
export interface NovaBusConfig {
  ratingA: number;
  rackFuseA: number;
  dcCB: string;
  imd: string;
}

/** HVAC bölümü: 2 HVAC → 4 raf (gdems S-001). */
export interface NovaSectionConfig {
  id: number;
  bank: string;
  racks: number[];
  hvac: number[];
}

/** Raf iç yapısı: 17 pack + BPU (E-001 Detail-1). */
export interface NovaRackConfig {
  packs: number;
  bpu: boolean;
  packKWh?: number;
  cellsPerPack?: number;
}

/** Konteyner AUX yükü (Calculation_BESS — UC-5 AUX paneli). */
export interface NovaAuxLoadConfig {
  key: string;
  label: string;
  kVA: number;
  peakKVA?: number;
  ups: boolean;
}

/** Yangın söndürme paneli (Sigma XT — UC-4 FSS). */
export interface NovaFssConfig {
  panel: string;
  zones: string[];
  releaseDelayS: number;
  detectors: number;
  detector: string;
  h2AlarmLEL: number;
  vents: string;
}

export interface NovaUnitConfig {
  container: string;
  containerMWh: number;
  banks: string[];
  racksPerBank: number;
  rackKWh?: number;
  cellsSeries: number;
  /** Konteyner DC bara/koruma künyesi (UC-4). */
  bus?: NovaBusConfig;
  /** HVAC bölümleri (UC-4). */
  sections?: NovaSectionConfig[];
  /** Raf iç yapısı (UC-5 pack sütunu). */
  rack?: NovaRackConfig;
  /** Konteyner AUX yükleri (UC-5 AUX paneli). */
  auxLoads?: NovaAuxLoadConfig[];
  /** Yangın söndürme paneli (UC-4 FSS). */
  fss?: NovaFssConfig;
  dcRangeV: [number, number];
  pcsAcV: number;
  pcsKVA: number;
  pcsMaxMW: number;
  trKVA: number;
  trRatio: string;
  trVector: string;
  lvLabel: string;
  rmu: NovaRmuCellConfig[];
}

export interface NovaLimits {
  socMin: number;
  socMax: number;
  tempMin: number;
  tempMax: number;
  derateC: number;
  derateReleaseC: number;
  dTdtWarn: number;
  dvWarn: number;
  sohInfo: number;
  /** Raf aşırı sıcaklık → blok trip (gdems limits.tripC). */
  tripC?: number;
  /** Idle "güç eşiği altında" sınırı (MW). */
  zeroPowerMW?: number;
  /** Periyodik kalibrasyon aralığı (gün). */
  calibrationIntervalDays?: number;
}

/** İç ihtiyaç trafosu ve AUX dağıtımı (UC-5 AUX paneli). */
export interface NovaAuxConfig {
  trKVA: number;
  trRatio: string;
  trVector: string;
  lvV: number;
  station: string;
}

export interface NovaFeederConfig {
  cell: string;
  side: "L" | "R";
  units: number[];
}

export interface NovaTopology {
  id: string;
  name: string;
  location: string;
  powerMW: number;
  energyMWh: number;
  station: NovaStationConfig;
  feeders: Record<string, NovaFeederConfig>;
  unit: NovaUnitConfig;
  /** İç ihtiyaç trafosu/AUX dağıtımı (UC-5). */
  aux?: NovaAuxConfig;
  limits: NovaLimits;
}

export interface NovaBankState {
  id: string;
  soc: number;
  soh: number;
  vdc: number;
  tmax: number;
  tmin?: number;
  dTdt10?: number;
  dvmV: number;
  /** Raf başına maks pack sıcaklığı (°C). */
  racks: number[];
  /** Raf başına SOC (%) — UC-5 Devices › Battery. */
  rackSoc?: number[];
  /** Raf başına DC gerilim (V). */
  rackV?: number[];
  /** Raf başına akım (A). */
  rackI?: number[];
  dcb: NovaSwitchPos;
}

export interface NovaPcsState {
  id: string;
  state: "chg" | "dis" | "stby" | "rest" | "fault" | "off";
  pMW: number;
  igbtC: number;
  limited: boolean;
  /** Grid line voltage AB (V) — PCS. */
  vac?: number;
  /** Grid frequency (Hz). */
  freq?: number;
  /** DC current (A). */
  idc?: number;
  /** DC/DC-side voltage (V). */
  dcVoltage?: number;
  /** AC/DC breaker positions. */
  acCb?: NovaSwitchPos;
  dcCb?: NovaSwitchPos;
  /** Emergency stop active. */
  estop?: boolean;
  /** Allowable charge / discharge power (kW). */
  chgLimitKw?: number;
  disLimitKw?: number;
  /** Active power setpoint (kW, signed). */
  setpointKw?: number;
  /** Grid reactive power (kVar). */
  reactiveKvar?: number;
  /** Power factor. */
  pf?: number;
  /** Fault status words (hex values). */
  faultWords?: number[];
}

export interface NovaRmuState {
  H01: NovaSwitchPos;
  H02: NovaSwitchPos;
  H03: NovaSwitchPos | null;
  es: boolean;
}

export interface NovaUnitStatus {
  text: string;
  sev: "alarm" | "warn" | "maint" | "cold" | "info" | null;
}

/** HVAC kompresör/heater modu (UC-4 Devices › HVAC). */
export type NovaHvacMode = "off" | "cool" | "heat" | "fan" | "fault" | "standby";

/** Tek HVAC ünitesi durumu (MC90 — container HVAC-1..8 telemetrisi). */
export interface NovaHvacState {
  id: number;
  /** Ekipman açık mı (standby dışı). */
  on: boolean;
  mode: NovaHvacMode;
  comp: boolean;
  heater: boolean;
  supplyT: number;
  returnT: number;
  outsideT?: number;
  condenserT?: number;
  evaporatorT?: number;
  inFanRpm?: number;
  outFanRpm?: number;
  acV?: number;
  rh?: number;
  runH?: number;
  compH?: number;
  alarms: string[];
}

/** AUX enerji analizörü (PM5340-1 — container LV feeder). */
export interface NovaAuxState {
  kW: number;
  kvar: number;
  v: number;
  iA: number;
  hz: number;
  pf: number;
  kwhDelivered?: number;
  kwhReceived?: number;
}

/** FSS paneli (Sigma XT + VIGI-DT1); CONTROL-PANEL-IO kuru kontak + FSS-1 detay. */
export interface NovaFssState {
  status: "normal" | "fire" | "fault" | "disabled" | "test";
  systemOk: boolean;
  fault: boolean;
  discharged: boolean;
  secondStage: boolean;
  mode: "auto" | "manual";
  released: boolean;
  imminent: boolean;
  countdown?: number;
  ventsOpen: boolean;
  disablements: { dE: boolean; dt: boolean; dc: boolean; dP: boolean; dA: boolean; db: boolean };
  zones: Array<{ id: number; name: string; state: string }>;
  detectors: Array<{
    id: number;
    lel: number;
    voc: number;
    rh: number;
    t: number;
    alarm: boolean;
    fault: boolean;
  }>;
}

/** DC ölçüm (DC-METER-1). */
export interface NovaDcState {
  voltage: number;
  current: number;
  powerKw: number;
  alarm: boolean;
}

export interface NovaUnitState {
  n: number;
  rmu: NovaRmuState;
  status?: NovaUnitStatus;
  banks: NovaBankState[];
  pcs: NovaPcsState[];
  /** HVAC üniteleri (UC-4). */
  hvac?: NovaHvacState[];
  /** AUX enerji analizörü (UC-4). */
  aux?: NovaAuxState;
  /** FSS panel durumu (UC-4). */
  fss?: NovaFssState;
  /** İzolasyon direnci (MΩ, IMD-1). */
  imdMOhm?: number;
  /** DC ölçüm (DC-METER-1). */
  dc?: NovaDcState;
}

export interface NovaStationState {
  H01: NovaSwitchPos;
  H02: NovaSwitchPos;
  H04: NovaSwitchPos;
  H05: NovaSwitchPos;
  kV: number;
  hz: number;
  es: Record<string, boolean>;
  iA: Record<string, number>;
}

export interface NovaMimicState {
  station: NovaStationState;
  poiMW: number;
  feederMW: Record<string, number>;
  units: NovaUnitState[];
  /** Ortam sıcaklığı (°C) — HVAC-1 `Outside Temp` (yoksa undefined). */
  ambient?: number;
}

/** Üniteleri elektriksel sıraya dizip fider metadata'sı ekler (saf). */
export function listNovaUnits(
  topo: NovaTopology,
): Array<{ n: number; feeder: string; side: "L" | "R"; row: number; last: boolean }> {
  const out: Array<{
    n: number;
    feeder: string;
    side: "L" | "R";
    row: number;
    last: boolean;
  }> = [];
  for (const [f, fd] of Object.entries(topo.feeders)) {
    fd.units.forEach((n, row) =>
      out.push({
        n,
        feeder: f,
        side: fd.side,
        row,
        last: row === fd.units.length - 1,
      }),
    );
  }
  return out.sort((a, b) => a.n - b.n);
}
