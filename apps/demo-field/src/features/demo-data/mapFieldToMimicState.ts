import type {
  NovaBankState,
  NovaMimicState,
  NovaPcsState,
  NovaStationState,
  NovaSwitchPos,
  NovaTopology,
  NovaUnitState,
} from "@gd-monorepo/ui";
import { listNovaUnits } from "@gd-monorepo/ui";
import type { TelemetryData } from "@gd-monorepo/shared-types";
import type { FieldContainer } from "./demoApi";
import { BANK_DEVICE_MAP, DEMO_MV_DEVICE_ID, DEMO_UNIT_COUNT } from "./demo-topology";
import { fanOutUnits } from "./fanOutUnits";
import {
  byCanonical,
  byName,
  canonicalNumber,
  indexByDevice,
  num,
  rowsMatching,
  truthy,
} from "./telemetry";

/**
 * Telemetri → mimic state eşlemesi (SPEC UC-2, FR-2.2..FR-2.6).
 *
 * Tek gerçek konteyner prototipini 9 sanal üniteye fan-out eder; bütün
 * türetmeler saftır (IO/rastgele yok). Beklenen eksik veri → güvenli
 * varsayılan; throw yok.
 */

const PCS_STATE_BY_CODE: Record<number, NovaPcsState["state"]> = {
  0: "off",
  1: "stby",
  2: "chg",
  3: "dis",
  6: "fault",
};

const SQRT3 = Math.sqrt(3);

function swPos(v: unknown, fallback: NovaSwitchPos = "closed"): NovaSwitchPos {
  if (v === undefined) return fallback;
  return truthy(v) ? "closed" : "open";
}

/** DC kesici (CB cihazı) → banka DC kesici pozisyonu. */
function dcBreaker(cbRows: TelemetryData[] | undefined): NovaSwitchPos {
  const closed = byName(cbRows, "Is Closed");
  if (closed === undefined) return "closed";
  return truthy(closed.value) ? "closed" : "open";
}

/** BSC satırlarından banka durumu. */
function buildBank(
  bscRows: TelemetryData[] | undefined,
  cbRows: TelemetryData[] | undefined,
  id: string,
  topo: NovaTopology,
): NovaBankState {
  const soc = canonicalNumber(bscRows, "soc") ?? 50;
  const soh = canonicalNumber(bscRows, "soh") ?? 100;
  const vdc = canonicalNumber(bscRows, "voltage") ?? 0;
  const avgTemp = canonicalNumber(bscRows, "temperature");

  const maxTemps = rowsMatching(bscRows, /Rack Max Pack Temp R\d+$/);
  const minTemps = rowsMatching(bscRows, /Rack Min Pack Temp R\d+$/);
  const maxCells = rowsMatching(bscRows, /Rack Max Cell Voltage R\d+$/);
  const minCells = rowsMatching(bscRows, /Rack Min Cell Voltage R\d+$/);
  const rackSocRows = rowsMatching(bscRows, /Rack SOC R\d+$/);
  const rackVoltRows = rowsMatching(bscRows, /Rack Cell Sum Voltage R\d+$/);
  const rackCurrRows = rowsMatching(bscRows, /Rack Current R\d+$/);

  const rackTemps =
    maxTemps.length > 0
      ? maxTemps.map((r) => r.value)
      : new Array<number>(topo.unit.racksPerBank).fill(avgTemp ?? 25);

  const tmax = rackTemps.length > 0 ? Math.max(...rackTemps) : (avgTemp ?? 25);
  const tmin =
    minTemps.length > 0
      ? Math.min(...minTemps.map((r) => r.value))
      : (avgTemp ?? tmax);

  let dvmV = 0;
  if (maxCells.length > 0 && minCells.length > 0) {
    const dV =
      Math.max(...maxCells.map((r) => r.value)) -
      Math.min(...minCells.map((r) => r.value));
    dvmV = Math.max(0, Math.round(dV * 1000));
  }

  return {
    id,
    soc,
    soh,
    vdc,
    tmax,
    tmin,
    dvmV,
    racks: rackTemps,
    ...(rackSocRows.length > 0 ? { rackSoc: rackSocRows.map((r) => r.value) } : {}),
    ...(rackVoltRows.length > 0 ? { rackV: rackVoltRows.map((r) => r.value) } : {}),
    ...(rackCurrRows.length > 0 ? { rackI: rackCurrRows.map((r) => r.value) } : {}),
    dcb: dcBreaker(cbRows),
  };
}

/** PCS satırlarından PCS durumu. */
function buildPcs(
  pcsRows: TelemetryData[] | undefined,
  id: string,
): NovaPcsState {
  const opStatus = num(byName(pcsRows, "PCS Operation Status")?.value ?? byCanonical(pcsRows, "operation_status")?.value);
  const state = opStatus !== undefined ? (PCS_STATE_BY_CODE[opStatus] ?? "stby") : "stby";

  const powerKw =
    num(byName(pcsRows, "Grid Active Power")?.value) ??
    canonicalNumber(pcsRows, "power_kw") ??
    0;

  const igbtRows = (pcsRows ?? []).filter((r) => r.name.startsWith("IGBT Temp"));
  const igbtC =
    igbtRows.length > 0
      ? Math.max(...igbtRows.map((r) => num(r.value) ?? 0))
      : 0;

  const limited =
    truthy(byName(pcsRows, "Derated Operation")?.value) ||
    truthy(byCanonical(pcsRows, "derated")?.value);

  return { id, state, pMW: Math.abs(powerKw) / 1000, igbtC, limited };
}

function n(v: number, d = 1): number {
  const p = 10 ** d;
  return Math.round(v * p) / p;
}

function signedMW(pcs: NovaPcsState): number {
  if (pcs.state === "chg") return -pcs.pMW;
  if (pcs.state === "dis") return pcs.pMW;
  return 0;
}

/** Demo-MV telemetrisinden station durumu (yoksa topoloji varsayılanı). */
function buildStation(
  mvRows: TelemetryData[] | undefined,
  topo: NovaTopology,
): NovaStationState {
  const cellPos = (id: string): NovaSwitchPos =>
    swPos(byName(mvRows, `${id} Breaker`)?.value);
  const es: Record<string, boolean> = {};
  for (const c of topo.station.cells) {
    if (c.es) es[c.id] = truthy(byName(mvRows, `${c.id} Earth`)?.value);
  }
  return {
    H01: cellPos("H01"),
    H02: cellPos("H02"),
    H04: cellPos("H04"),
    H05: cellPos("H05"),
    kV: num(byName(mvRows, "Bus Voltage")?.value) ?? topo.station.nominalKV,
    hz: num(byName(mvRows, "Frequency")?.value) ?? 50,
    es,
    iA: {},
  };
}

/** Fider MW + POI (işaretli) ve CT akımları. */
function derivePower(
  units: NovaUnitState[],
  topo: NovaTopology,
  station: NovaStationState,
): { poiMW: number; feederMW: Record<string, number>; iA: Record<string, number> } {
  const meta = new Map(listNovaUnits(topo).map((m) => [m.n, m.feeder]));
  const feederMW: Record<string, number> = {};
  for (const f of Object.keys(topo.feeders)) feederMW[f] = 0;

  let poiMW = 0;
  for (const u of units) {
    const f = meta.get(u.n);
    for (const pcs of u.pcs) {
      const s = signedMW(pcs);
      poiMW += s;
      if (f !== undefined) feederMW[f] += s;
    }
  }

  const kV = station.kV > 0 ? station.kV : topo.station.nominalKV;
  const amps = (mw: number): number => n((Math.abs(mw) * 1000) / (SQRT3 * kV), 0);
  const iA: Record<string, number> = {
    H01: amps(poiMW),
    H03: amps(poiMW),
    H04: amps(feederMW.B ?? 0),
    H05: amps(feederMW.A ?? 0),
  };

  return {
    poiMW: n(poiMW, 2),
    feederMW: Object.fromEntries(
      Object.entries(feederMW).map(([k, v]) => [k, n(v, 2)]),
    ),
    iA,
  };
}

/** Boş durum — telemetri yokken. */
function emptyState(topo: NovaTopology): NovaMimicState {
  return {
    station: buildStation(undefined, topo),
    poiMW: 0,
    feederMW: Object.fromEntries(Object.keys(topo.feeders).map((f) => [f, 0])),
    units: [],
  };
}

export interface MapFieldOptions {
  unitCount?: number;
  /** Konteyner payload'ında olmayan field-tier cihaz satırları (PCS/MV). */
  extraTelemetry?: TelemetryData[];
}

/**
 * Ana eşleme: konteynerler (latestTelemetry) + field-tier telemetri + topoloji
 * → mimic state. İlk konteyner prototip kabul edilir (tek gerçek konteyner).
 */
export function mapFieldToMimicState(
  containers: FieldContainer[],
  topo: NovaTopology,
  opts: MapFieldOptions = {},
): NovaMimicState {
  const rows = [
    ...containers.flatMap((c) => c.latestTelemetry),
    ...(opts.extraTelemetry ?? []),
  ];
  if (rows.length === 0) return emptyState(topo);
  const unitCount = opts.unitCount ?? DEMO_UNIT_COUNT;

  const byDevice = indexByDevice(rows);

  const proto: Omit<NovaUnitState, "n"> = {
    rmu: { H01: "closed", H02: "closed", H03: "closed", es: false },
    banks: [
      buildBank(byDevice.get(BANK_DEVICE_MAP.A.bsc), byDevice.get("CB-1"), "A", topo),
      buildBank(byDevice.get(BANK_DEVICE_MAP.B.bsc), byDevice.get("CB-2"), "B", topo),
    ],
    pcs: [
      buildPcs(byDevice.get(BANK_DEVICE_MAP.A.pcs), "A"),
      buildPcs(byDevice.get(BANK_DEVICE_MAP.B.pcs), "B"),
    ],
  };

  const units = fanOutUnits(proto, unitCount);
  // Son ünitede H03 (radyal hat sonu) yoktur.
  const lastByN = new Set(
    listNovaUnits(topo)
      .filter((m) => m.last)
      .map((m) => m.n),
  );
  for (const u of units) {
    if (lastByN.has(u.n)) u.rmu.H03 = null;
  }

  const station = buildStation(byDevice.get(DEMO_MV_DEVICE_ID), topo);
  const { poiMW, feederMW, iA } = derivePower(units, topo, station);
  station.iA = iA;

  return { station, poiMW, feederMW, units };
}
