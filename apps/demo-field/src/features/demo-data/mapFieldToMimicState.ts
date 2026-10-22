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
import { DEMO_STATIONS, type DemoStation } from "./demo-stations";
import { fanOutUnits } from "./fanOutUnits";
import {
  buildAux,
  buildDc,
  buildFss,
  buildHvacList,
  buildImd,
} from "./buildDevices";
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

// Fail-closed: pozisyon telemetrisi YOKSA "open" (kapalı varsaymak izinleri yanlışlıkla verirdi).
function swPos(v: unknown, fallback: NovaSwitchPos = "open"): NovaSwitchPos {
  if (v === undefined) return fallback;
  return truthy(v) ? "closed" : "open";
}

/** DC kesici (CB cihazı) → banka DC kesici pozisyonu. */
function dcBreaker(cbRows: TelemetryData[] | undefined): NovaSwitchPos {
  const closed = byName(cbRows, "Is Closed");
  if (closed === undefined) return "open";
  return truthy(closed.value) ? "closed" : "open";
}

/** BSC satırlarından banka durumu. */
function buildBank(
  bscRows: TelemetryData[] | undefined,
  cbRows: TelemetryData[] | undefined,
  id: string,
  topo: NovaTopology,
): NovaBankState {
  // Veri yoksa uydurma 50 %/100 % YOK: 0 + noData bayrağı (izinler bloklanır).
  const noData = !bscRows || bscRows.length === 0 || canonicalNumber(bscRows, "soc") === undefined;
  const soc = canonicalNumber(bscRows, "soc") ?? 0;
  const soh = canonicalNumber(bscRows, "soh") ?? 0;
  const vdc = canonicalNumber(bscRows, "voltage") ?? 0;
  const avgTemp = canonicalNumber(bscRows, "temperature");

  const maxTemps = rowsMatching(bscRows, /Rack Max Pack Temp R\d+$/);
  const minTemps = rowsMatching(bscRows, /Rack Min Pack Temp R\d+$/);
  const maxCells = rowsMatching(bscRows, /Rack Max Cell Voltage R\d+$/);
  const minCells = rowsMatching(bscRows, /Rack Min Cell Voltage R\d+$/);
  const rackSocRows = rowsMatching(bscRows, /Rack SOC R\d+$/);
  const rackVoltRows = rowsMatching(bscRows, /Rack Cell Sum Voltage R\d+$/);
  const rackCurrRows = rowsMatching(bscRows, /Rack Current R\d+$/);

  // Raf register tablosu için ham raf telemetrisi (uydurma değer yerine canlı veri).
  const rackRaw: Array<Record<string, number>> = [];
  const bscRaw: Record<string, number> = {};
  for (const r of bscRows ?? []) {
    const m = /^(.*) R(\d+)$/.exec(r.name);
    const v = num(r.value);
    if (v === undefined) continue;
    if (!m) {
      bscRaw[r.name] = v;
      continue;
    }
    const idx = Number(m[2]) - 1;
    (rackRaw[idx] ??= {})[m[1] as string] = v;
  }

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

  const bscState = num(byName(bscRows, "BSC State")?.value);
  const online = num(byName(bscRows, "Online Rack No")?.value);
  const chargeStatus = num(byName(bscRows, "ChargeStatus")?.value);

  return {
    id,
    ...(noData ? { noData: true } : {}),
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
    ...(rackRaw.length > 0 ? { rackRaw } : {}),
    ...(Object.keys(bscRaw).length > 0 ? { raw: bscRaw } : {}),
    ...(num(byName(bscRows, "Avg Pack Temp")?.value) !== undefined
      ? { tavg: num(byName(bscRows, "Avg Pack Temp")?.value) as number }
      : {}),
    ...(bscState !== undefined ? { bscState } : {}),
    ...(online !== undefined ? { online } : {}),
    ...(chargeStatus !== undefined ? { chargeStatus } : {}),
    dcb: dcBreaker(cbRows),
  };
}

/** PCS satırlarından PCS durumu (canlı PCS telemetrisi — UC-4). */
function buildPcs(
  pcsRows: TelemetryData[] | undefined,
  id: string,
): NovaPcsState {
  const opStatus = num(byName(pcsRows, "PCS Operation Status")?.value ?? byCanonical(pcsRows, "operation_status")?.value);
  // Durum okunamıyorsa "stby" (hazır) DEĞİL "off" + noData — fail-closed.
  const state = opStatus !== undefined ? (PCS_STATE_BY_CODE[opStatus] ?? "fault") : "off";
  const pcsNoData = opStatus === undefined;

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

  const faultWords = (pcsRows ?? [])
    .filter((r) => /^Fault Status Word \d+$/.test(r.name))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
    .map((r) => num(r.value) ?? 0);

  const setpoint = num(byName(pcsRows, "Active Power Setpoint")?.value);
  const signedSetpoint =
    setpoint !== undefined ? (state === "chg" ? -Math.abs(setpoint) : setpoint) : undefined;

  return {
    id,
    state,
    ...(pcsNoData ? { noData: true } : {}),
    pMW: Math.abs(powerKw) / 1000,
    igbtC,
    limited,
    ...(num(byName(pcsRows, "Grid Voltage AB")?.value) !== undefined
      ? { vac: num(byName(pcsRows, "Grid Voltage AB")?.value) }
      : {}),
    ...(num(byName(pcsRows, "Grid Frequency")?.value) !== undefined
      ? { freq: num(byName(pcsRows, "Grid Frequency")?.value) }
      : {}),
    ...(num(byName(pcsRows, "DC Current")?.value) !== undefined
      ? { idc: num(byName(pcsRows, "DC Current")?.value) }
      : {}),
    ...(num(byName(pcsRows, "Battery Voltage")?.value) !== undefined
      ? { dcVoltage: num(byName(pcsRows, "Battery Voltage")?.value) }
      : {}),
    ...(byName(pcsRows, "AC Circuit Breaker Status")?.value !== undefined
      ? { acCb: swPos(byName(pcsRows, "AC Circuit Breaker Status")?.value) }
      : {}),
    ...(byName(pcsRows, "DC Circuit Breaker Status 1")?.value !== undefined
      ? { dcCb: swPos(byName(pcsRows, "DC Circuit Breaker Status 1")?.value) }
      : {}),
    ...(byName(pcsRows, "Emergency Stop Button Status")?.value !== undefined
      ? { estop: truthy(byName(pcsRows, "Emergency Stop Button Status")?.value) }
      : {}),
    ...(num(byName(pcsRows, "Max Allowable Charging Power")?.value) !== undefined
      ? { chgLimitKw: num(byName(pcsRows, "Max Allowable Charging Power")?.value) }
      : {}),
    ...(num(byName(pcsRows, "Max Allowable Discharging Power")?.value) !== undefined
      ? { disLimitKw: num(byName(pcsRows, "Max Allowable Discharging Power")?.value) }
      : {}),
    ...(signedSetpoint !== undefined ? { setpointKw: signedSetpoint } : {}),
    ...(num(byName(pcsRows, "Grid Reactive Power")?.value) !== undefined
      ? { reactiveKvar: num(byName(pcsRows, "Grid Reactive Power")?.value) }
      : {}),
    ...(num(byName(pcsRows, "Power Factor")?.value) !== undefined
      ? { pf: num(byName(pcsRows, "Power Factor")?.value) }
      : {}),
    ...(faultWords.length > 0 ? { faultWords } : {}),
  };
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
    // Ölçüm yoksa 0 (nominal 34.5 kV / 50 Hz uydurulmaz; FL-01 MV kontrolü düşer).
    kV: num(byName(mvRows, "Bus Voltage")?.value) ?? 0,
    hz: num(byName(mvRows, "Frequency")?.value) ?? 0,
    es,
    iA: {},
  };
}

/** Fider MW + POI (işaretli) ve CT akımları. */
function derivePower(
  units: NovaUnitState[],
  topo: NovaTopology,
  station: NovaStationState,
  stationsConfig: readonly DemoStation[],
): { poiMW: number; feederMW: Record<string, number>; iA: Record<string, number> } {
  const meta = new Map<number, string>(listNovaUnits(topo).map((m) => [m.n, m.feeder]));
  // 2 istasyon × 9 ünite: ünite→fider eşlemesi istasyon config'inden (10–18 dahil).
  for (const st of stationsConfig) {
    for (const n of st.feeders.A) meta.set(n, "A");
    for (const n of st.feeders.B) meta.set(n, "B");
  }
  const feederMW: Record<string, number> = {};
  for (const f of Object.keys(topo.feeders)) feederMW[f] = 0;

  // POI = Σ PCS (işaretli) − grup AUX yükü (PM5340). H03 sayacının register
  // haritası yok (M2) → değer PMS HESABIDIR; AUX POI'nin içinde tüketilir.
  let poiMW = 0;
  for (const u of units) {
    const f = meta.get(u.n);
    const auxMW = (u.aux?.kW ?? 0) / 1000;
    let unitMW = -auxMW;
    for (const pcs of u.pcs) unitMW += signedMW(pcs);
    poiMW += unitMW;
    if (f !== undefined) feederMW[f] = (feederMW[f] ?? 0) + unitMW;
  }

  const kV = station.kV > 0 ? station.kV : topo.station.nominalKV;
  const amps = (mw: number): number => n((Math.abs(mw) * 1000) / (SQRT3 * kV), 0);
  const iA: Record<string, number> = {
    H01: amps(poiMW),
    H03: amps(poiMW),
  };
  // Fider CT akımı topolojideki fider→hücre eşlemesinden (A→H04, B→H05).
  // Eskiden sabit kodlu ve TERS idi (H04 ← B).
  const feeders = topo.feeders as Record<string, { cell: string }>;
  for (const [f, def] of Object.entries(feeders)) {
    iA[def.cell] = amps(feederMW[f] ?? 0);
  }

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
  /** EMS topolojisinden gelen istasyonlar (yoksa statik DEMO_STATIONS). */
  stations?: readonly DemoStation[];
}

/** Tek konteynerin cihaz satırlarından sanal ünite prototipi (fan-out öncesi). */
function buildProto(
  byDevice: Map<string, TelemetryData[]>,
  topo: NovaTopology,
  pcs: readonly [string, string],
): Omit<NovaUnitState, "n"> {
  const hvac = buildHvacList(byDevice);
  const aux = buildAux(byDevice.get("PM5340-1"));
  const fss = buildFss(byDevice.get("CONTROL-PANEL-IO-1"), byDevice.get("FSS-1"), topo.unit.fss);
  const imdMOhm = buildImd(byDevice.get("IMD-1"));
  const dc = buildDc(byDevice.get("DC-METER-1"));
  return {
    rmu: { H01: "closed", H02: "closed", H03: "closed", es: false },
    banks: [
      buildBank(byDevice.get(BANK_DEVICE_MAP.A.bsc), byDevice.get("CB-1"), "A", topo),
      buildBank(byDevice.get(BANK_DEVICE_MAP.B.bsc), byDevice.get("CB-2"), "B", topo),
    ],
    pcs: [
      buildPcs(byDevice.get(pcs[0]), "A"),
      buildPcs(byDevice.get(pcs[1]), "B"),
    ],
    ...(hvac.length > 0 ? { hvac } : {}),
    ...(aux ? { aux } : {}),
    ...(fss ? { fss } : {}),
    ...(imdMOhm !== undefined ? { imdMOhm } : {}),
    ...(dc ? { dc } : {}),
  };
}

/**
 * Ana eşleme: konteynerler (latestTelemetry) + field-tier telemetri + topoloji
 * → mimic state. UC-13: konteynerler `station` etiketiyle gruplanır; **her
 * istasyon kendi konteynerinin satırlarından** prototip üretir ve o istasyonun
 * ünite dilimine fan-out edilir. Etiket yoksa tüm konteynerler birleştirilir
 * (mevcut davranış). Throw yok.
 */
export function mapFieldToMimicState(
  containers: FieldContainer[],
  topo: NovaTopology,
  opts: MapFieldOptions = {},
): NovaMimicState {
  const extra = opts.extraTelemetry ?? [];
  const hasAny = containers.some((c) => c.latestTelemetry.length > 0) || extra.length > 0;
  if (!hasAny) return emptyState(topo);

  const allRows = [...containers.flatMap((c) => c.latestTelemetry), ...extra];
  const stationsConfig = opts.stations ?? DEMO_STATIONS;
  const available = new Set(containers.map((c) => c.containerId));
  const units: NovaUnitState[] = [];
  /** İstasyon key → o istasyonun MV panosu (istasyon başına 1 MV simülatörü). */
  const stations: Record<string, NovaStationState> = {};
  const lastUnitByStation: number[] = [];

  for (const station of stationsConfig) {
    // EMS topolojisi: istasyon→konteyner eşlemesi. Eşleşme yoksa (endpoint yok /
    // tek konteynerli kurulum) tüm konteynerler o istasyonun prototipi olur.
    const matched = station.containerIds.filter((id) => available.has(id));
    const containerIds = matched.length > 0 ? matched : containers.map((c) => c.containerId);
    const containerRows = containers
      .filter((c) => containerIds.includes(c.containerId))
      .flatMap((c) => c.latestTelemetry);
    const rows = [...containerRows, ...extra];
    if (rows.length === 0) continue;
    const byDevice = indexByDevice(rows);
    const proto = buildProto(byDevice, topo, station.pcs);
    const stUnits = fanOutUnits(proto, station.units.length);
    station.units.forEach((n, i) => {
      if (stUnits[i]) stUnits[i].n = n;
    });
    units.push(...stUnits);
    stations[station.key] = buildStation(byDevice.get(station.mvDeviceId), topo);
    const lastUnit = station.units.at(-1);
    if (lastUnit !== undefined) lastUnitByStation.push(lastUnit);
  }
  units.sort((a, b) => a.n - b.n);

  // Son ünitede H03 (radyal hat sonu) yoktur — her istasyonun son ünitesi.
  const lastByN = new Set<number>(lastUnitByStation);
  for (const u of units) {
    if (lastByN.has(u.n)) u.rmu.H03 = null;
  }

  const byDeviceAll = indexByDevice(allRows);
  const station =
    Object.values(stations)[0] ?? buildStation(byDeviceAll.get(DEMO_MV_DEVICE_ID), topo);
  if (Object.keys(stations).length === 0) {
    stations["bess1"] = station;
  }
  const { poiMW, feederMW, iA } = derivePower(units, topo, station, stationsConfig);
  station.iA = iA;

  const ambient = num(byName(byDeviceAll.get("HVAC-1"), "Outside Temp")?.value);

  return {
    station,
    stations,
    poiMW,
    feederMW,
    units,
    ...(ambient !== undefined ? { ambient } : {}),
  };
}
