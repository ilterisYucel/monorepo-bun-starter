import type { NovaMimicState, NovaTopology, NovaUnitState } from "./mimic-types";
import { defaultUnitStatus } from "./nova-mimic";

/**
 * Plant overview türevleri (SPEC UC-11, K-11) — referans `plant-view.js#render`
 * standalone dalının saf karşılığı. Girdi: `NovaMimicState` + topoloji; çıktı:
 * tek hat + yan panel için düzleştirilmiş canlı değerler. IO/zaman yoktur.
 *
 * Günlük enerji, referansa uygun olarak POI güç serisinden entegre edilir
 * (fiziksel POI ≈ BESS ± AUX); sayaç register'ı yoksa yaklaşımdır ve
 * `approximate: true` ile işaretlenir. Boş seri → `hasData:false`, "—".
 */

export interface PlantUnitView {
  n: number;
  /** İşaretli aktif güç (MW): + deşarj, − şarj. */
  mw: number;
  soc: number;
  tmax: number;
  status: string;
  sev: "alarm" | "warn" | "cold" | "maint" | null;
}

export interface PlantDailyEnergy {
  hasData: boolean;
  exportedMWh: number;
  importedMWh: number;
  bessInMWh: number;
  bessOutMWh: number;
  cycles: number;
  approximate: boolean;
}

export interface PlantOverview {
  poiMW: number;
  poiKv: number;
  poiHz: number;
  poiAmp: number;
  feeders: Array<{ id: "A" | "B"; mw: number; amp: number; first: number; last: number }>;
  auxKW: number;
  units: PlantUnitView[];
  daily: PlantDailyEnergy;
}

const amps = (mw: number, kv: number): number => (kv > 0.1 ? (Math.abs(mw) * 1e3) / (Math.sqrt(3) * kv) : 0);

const signedPcs = (p: NovaUnitState["pcs"][number]): number =>
  p.state === "dis" ? p.pMW : p.state === "chg" ? -p.pMW : 0;

/** `NovaMimicState` + topoloji → plant overview görünümü. */
export function derivePlantOverview(state: NovaMimicState, topology: NovaTopology): PlantOverview {
  const kv = state.station.kV;
  const units = state.units.map((u) => plantUnitView(u, topology));
  const feeders = (Object.entries(topology.feeders) as Array<[string, { units: number[] }]>).map(([id, fd]) => {
    const mw = state.feederMW?.[id] ?? 0;
    return {
      id: id as "A" | "B",
      mw,
      amp: amps(mw, kv),
      first: fd.units[0] ?? 0,
      last: fd.units[fd.units.length - 1] ?? 0,
    };
  });
  return {
    poiMW: state.poiMW,
    poiKv: kv,
    poiHz: state.station.hz,
    poiAmp: amps(state.poiMW, kv),
    feeders,
    auxKW: state.units[0]?.aux?.kW ?? 0,
    units,
    daily: emptyDaily(),
  };
}

function emptyDaily(): PlantDailyEnergy {
  return { hasData: false, exportedMWh: 0, importedMWh: 0, bessInMWh: 0, bessOutMWh: 0, cycles: 0, approximate: true };
}

/** İstasyon bölüm config'i (referans `plantLayout` feeders + `stationTopo`). */
export interface PlantStationConfig {
  readonly index: number;
  readonly key: string;
  readonly name: string;
  readonly feeder: "A" | "B";
  readonly units: readonly number[];
}

export interface PlantStationView {
  index: number;
  key: string;
  name: string;
  feeder: "A" | "B";
  units: PlantUnitView[];
  n: number;
  first: number;
  last: number;
  mw: number;
  soc: number;
  tmax: number;
  status: string;
  sev: "alarm" | "warn" | "cold" | "maint" | null;
  available: number;
  energyMWh: number;
}

export interface CollectorOverview {
  poiMW: number;
  poiKv: number;
  poiHz: number;
  poiAmp: number;
  auxKW: number;
  stations: PlantStationView[];
}

/** Tek ünite görünümü (saf; `derivePlantOverview` ve `deriveStationView` paylaşır). */
export function plantUnitView(u: NovaUnitState, topology: NovaTopology): PlantUnitView {
  const status = u.status ?? defaultUnitStatus(u, topology.limits);
  const soc = u.banks.length ? u.banks.reduce((a, b) => a + b.soc, 0) / u.banks.length : 0;
  const tmax = u.banks.length ? Math.max(...u.banks.map((b) => b.tmax)) : 0;
  return {
    n: u.n,
    mw: u.pcs.reduce((a, p) => a + signedPcs(p), 0),
    soc,
    tmax,
    status: status.text,
    sev: status.sev === "info" ? null : status.sev,
  };
}

/** İstasyon kartı görünümü (referans `collectorSvg` BESS box). */
export function deriveStationView(
  state: NovaMimicState,
  topology: NovaTopology,
  cfg: PlantStationConfig,
): PlantStationView {
  const units = state.units
    .filter((u) => cfg.units.includes(u.n))
    .map((u) => plantUnitView(u, topology));
  const mw = units.reduce((a, u) => a + u.mw, 0);
  const soc = units.length ? units.reduce((a, u) => a + u.soc, 0) / units.length : 0;
  const tmax = units.length ? Math.max(...units.map((u) => u.tmax)) : 0;
  const sev = units.some((u) => u.sev === "alarm")
    ? "alarm"
    : units.some((u) => u.sev === "maint")
      ? "maint"
      : units.some((u) => u.sev === "cold")
        ? "cold"
        : units.some((u) => u.sev === "warn")
          ? "warn"
          : null;
  const status =
    sev === "alarm"
      ? "FAULT"
      : mw > 0.05
        ? "DISCHARGE"
        : mw < -0.05
          ? "CHARGE"
          : units.some((u) => u.status === "REST")
            ? "REST"
            : "STANDBY";
  const ns = units.map((u) => u.n);
  return {
    index: cfg.index,
    key: cfg.key,
    name: cfg.name,
    feeder: cfg.feeder,
    units,
    n: units.length,
    first: ns.length ? Math.min(...ns) : 0,
    last: ns.length ? Math.max(...ns) : 0,
    mw,
    soc,
    tmax,
    status,
    sev,
    available: units.filter((u) => u.sev !== "alarm").length,
    energyMWh: units.length * topology.unit.containerMWh,
  };
}

/** Collector görünümü (grid ← collector ← BESS MV istasyonları). */
export function deriveCollectorOverview(
  state: NovaMimicState,
  topology: NovaTopology,
  stations: readonly PlantStationConfig[],
): CollectorOverview {
  const kv = state.station.kV;
  return {
    poiMW: state.poiMW,
    poiKv: kv,
    poiHz: state.station.hz,
    poiAmp: amps(state.poiMW, kv),
    auxKW: state.units[0]?.aux?.kW ?? 0,
    stations: stations.map((cfg) => deriveStationView(state, topology, cfg)),
  };
}

/** Ana-kaynak (PV/wind) MV istasyon config'i — illüstratif (backend verisi yok). */
export interface PlantSourceConfig {
  readonly index: number;
  readonly key: string;
  readonly name: string;
  readonly units: readonly number[];
  readonly unitMVA: number;
  readonly mw: number;
}

export interface PlantSourceView {
  index: number;
  key: string;
  name: string;
  n: number;
  unitMVA: number;
  mw: number;
  /** İnverter başına statik güç (MW). */
  unitMW: number[];
}

/** İllüstratif kaynak istasyonları (statik değerler; per-unit MW eşit bölünür). */
export function deriveSourceStations(cfgs: readonly PlantSourceConfig[]): PlantSourceView[] {
  return cfgs.map((c) => {
    const per = c.units.length ? c.mw / c.units.length : 0;
    return {
      index: c.index,
      key: c.key,
      name: c.name,
      n: c.units.length,
      unitMVA: c.unitMVA,
      mw: c.mw,
      unitMW: c.units.map(() => per),
    };
  });
}

const DAY_MS = 86_400_000;

export interface PeakSample {
  t: number;
  /** Güneş üretimi (MW). */
  src: number;
  /** Collector çıkışı (MW) = üretim + BESS (statik 0). */
  poi: number;
  /** Peak eşiği (MW). */
  threshold: number;
  /** Bağlantı limiti (MW). */
  conn: number;
  /** "Shaved → stored" bandı alt/üst. */
  shaveLower: number;
  shaveUpper: number;
  /** "Released from BESS" bandı alt/üst. */
  relLower: number;
  relUpper: number;
}

export interface PeakSeries {
  samples: PeakSample[];
  t0: number;
  t1: number;
}

/**
 * "Solar production & peak shaving · today" serisi (SPEC FR-11.11) — referans
 * `plant-view.js#peakChartFor` portu. demo-field'te gerçek solar telemetrisi
 * yok → **sentetik/illüstratif** clear-sky eğrisi (deterministik; `nowMs`
 * parametre). BESS statik 0 (Manual) → release bandı boş.
 */
export function buildPeakSeries(
  nowMs: number,
  connMW: number,
  peakMW: number,
  solarMW: number,
): PeakSeries {
  const t0 = Math.floor(nowMs / DAY_MS) * DAY_MS;
  const t1 = t0 + DAY_MS;
  const step = 15 * 60_000;
  const samples: PeakSample[] = [];
  for (let t = t0; t <= t1; t += step) {
    const h = (t % DAY_MS) / 3_600_000;
    const sun = h > 6.6 && h < 17.9 ? Math.sin((Math.PI * (h - 6.6)) / 11.3) : 0;
    const src = solarMW * Math.pow(Math.max(0, sun), 1.25) * 0.9;
    const threshold = Math.min(peakMW, connMW);
    const shaveLower = Math.min(src, threshold);
    samples.push({
      t,
      src,
      poi: src,
      threshold,
      conn: connMW,
      shaveLower,
      shaveUpper: src,
      relLower: src,
      relUpper: src,
    });
  }
  return { samples, t0, t1 };
}

/** Peak serisinin günlük enerji toplamları (MWh). */
export function peakEnergySums(
  samples: readonly PeakSample[],
): { productionMWh: number; shavedMWh: number; releasedMWh: number; curtailedMWh: number } {
  let production = 0;
  let shaved = 0;
  let released = 0;
  let curtailed = 0;
  for (let i = 1; i < samples.length; i += 1) {
    const prev = samples[i - 1]!;
    const cur = samples[i]!;
    const dt = (cur.t - prev.t) / 3_600_000;
    if (dt <= 0) continue;
    production += cur.src * dt;
    shaved += Math.max(0, cur.src - cur.threshold) * dt;
    released += Math.max(0, cur.relUpper - cur.relLower) * dt;
    curtailed += Math.max(0, cur.src - cur.conn) * dt;
  }
  return { productionMWh: production, shavedMWh: shaved, releasedMWh: released, curtailedMWh: curtailed };
}


/**
 * POI güç serisinden günlük enerji (MWh) entegrasyonu.
 * @param points [{t (ms), value (MW)}] — zamana göre sıralanır.
 * @param groups BESS grup sayısı (cycle hesabı)
 * @param containerMWh grup başına enerji (MWh)
 */
export function dailyEnergy(
  points: Array<{ t: number; value: number }>,
  groups: number,
  containerMWh: number,
): PlantDailyEnergy {
  const valid = points.filter((p) => Number.isFinite(p.t) && Number.isFinite(p.value)).sort((a, b) => a.t - b.t);
  if (valid.length < 2) return emptyDaily();
  let exported = 0;
  let imported = 0;
  for (let i = 1; i < valid.length; i += 1) {
    const prev = valid[i - 1]!;
    const cur = valid[i]!;
    const dt = (cur.t - prev.t) / 3.6e6; // ms → saat
    if (dt <= 0) continue;
    const v = cur.value;
    if (v > 0) exported += v * dt;
    else imported += -v * dt;
  }
  const cycles = groups > 0 && containerMWh > 0 ? exported / (groups * containerMWh) : 0;
  return {
    hasData: true,
    exportedMWh: exported,
    importedMWh: imported,
    bessInMWh: imported,
    bessOutMWh: exported,
    cycles,
    approximate: true,
  };
}
