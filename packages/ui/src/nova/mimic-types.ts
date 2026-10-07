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
  es?: boolean;
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
  kind: "lbs" | "cb";
}

export interface NovaUnitConfig {
  container: string;
  containerMWh: number;
  banks: string[];
  racksPerBank: number;
  cellsSeries: number;
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
  racks: number[];
  dcb: NovaSwitchPos;
}

export interface NovaPcsState {
  id: string;
  state: "chg" | "dis" | "stby" | "rest" | "fault" | "off";
  pMW: number;
  igbtC: number;
  limited: boolean;
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

export interface NovaUnitState {
  n: number;
  rmu: NovaRmuState;
  status?: NovaUnitStatus;
  banks: NovaBankState[];
  pcs: NovaPcsState[];
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
