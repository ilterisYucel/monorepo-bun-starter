import type { FieldTopology } from "@gd-monorepo/shared-types";
import type { NovaMimicState, NovaTopology } from "@gd-monorepo/ui";
import { DEMO_TOPOLOGY, DEMO_UNIT_COUNT } from "./demo-topology";

/**
 * Demo istasyon bölümü (SPEC UC-11/T-47, K-11). gdems `projects.js#stationTopo`
 * portu: proje MANUEL olarak 2 BESS MV istasyonuna bölünür (ileride backend
 * config'i bunu sağlayacak):
 *   #1 = BESS#1–5 (Feeder A / H04)
 *   #2 = BESS#6–9 (Feeder B / H05)
 * Fan-out 9 ünite korunur; istasyon topo'su yalnız o istasyonun fider dilimidir.
 * Saf: IO/zaman yok.
 */

export interface DemoStation {
  /** 0-tabanlı index (gdems `activate(pi, k)`). */
  readonly index: number;
  readonly key: string;
  readonly name: string;
  /** İstasyonun iki fideri ve üniteleri (A: 5, B: 4) — gdems şablonu. */
  readonly feeders: { readonly A: readonly number[]; readonly B: readonly number[] };
  readonly units: readonly number[];
  /** İstasyonu kontrol eden field PCS çifti (2 gerçek PCS/istasyon, K-18). */
  readonly pcs: readonly [string, string];
  /** İstasyonun MV simülatörü (istasyon başına 1; H04/H05 bu panonun fiderleri). */
  readonly mvDeviceId: string;
  /** İstasyonu temsil eden konteynerler (hub peer id'leri; EMS topolojisi). */
  readonly containerIds: readonly string[];
}

/** Collector (grid ile istasyonlar arası ortak bara) — 31.05 MW ≤ 50 → MV STATION. */
export const DEMO_COLLECTOR = {
  name: "MV STATION",
  label: "MV STATION · 34.5 kV",
  limitMW: 50,
  /** İstasyon fider hücresi (Q01 incomer, Q02 metering; Q04/Q05 istasyon fiderleri). */
  cellOf: (index: number): string => `Q0${index + 4}`,
} as const;

const range = (from: number, count: number): number[] => Array.from({ length: count }, (_, i) => from + i);

export const DEMO_STATIONS: readonly DemoStation[] = [
  {
    index: 0, key: "bess1", name: "BESS MV STATION #1",
    feeders: { A: range(1, 5), B: range(6, 4) }, units: range(1, 9),
    pcs: ["PCS-1", "PCS-2"], mvDeviceId: "DEMO-MV-1",
    containerIds: ["container-1"],
  },
  {
    index: 1, key: "bess2", name: "BESS MV STATION #2",
    feeders: { A: range(10, 5), B: range(15, 4) }, units: range(10, 9),
    pcs: ["PCS-3", "PCS-4"], mvDeviceId: "DEMO-MV-2",
    containerIds: ["container-2"],
  },
];

/**
 * EMS topolojisinden (web-service `GET /fields/:id/topology`) DemoStation
 * modeline dönüşüm; endpoint yoksa statik DEMO_STATIONS'a düşer.
 */
export function stationsFromTopology(topology: FieldTopology | undefined): DemoStation[] {
  if (topology === undefined || topology.stations.length === 0) return [...DEMO_STATIONS];
  return topology.stations.map((station, index) => ({
    index,
    key: station.key,
    name: station.name,
    feeders: { A: [...station.feeders.A.units], B: [...station.feeders.B.units] },
    units: [...station.units],
    pcs: [station.pcs[0] ?? "PCS-1", station.pcs[1] ?? "PCS-2"] as [string, string],
    mvDeviceId: station.mvDeviceId,
    containerIds: [...station.containers],
  }));
}

/** İstasyon key'i (bess1/bess2) → field PCS çifti; bilinmeyen key'de ilk istasyon. */
export function pcsIdsForStation(key: string | undefined): readonly [string, string] {
  return DEMO_STATIONS.find((s) => s.key === key)?.pcs ?? DEMO_STATIONS[0]!.pcs;
}

/** Ünite numarası hangi istasyonda? */
export function stationForUnit(n: number): DemoStation | undefined {
  return DEMO_STATIONS.find((s) => s.units.includes(n));
}

/** İstasyonun ünite listesi (state süzme için). */
export function stationUnits(station: DemoStation): number[] {
  return [...station.units];
}

/**
 * İstasyon topolojisi: gdems `stationTopo` — çizim DEĞİŞMEZ (2 fider, 9 ünite),
 * yalnız üniteler istasyona göre yeniden numaralanır (st1: 1–9, st2: 10–18).
 */
export function stationTopo(station: DemoStation): NovaTopology {
  return {
    ...DEMO_TOPOLOGY,
    station: {
      ...DEMO_TOPOLOGY.station,
      name: station.name,
      poiLabel: `TO ${DEMO_COLLECTOR.name} ${DEMO_COLLECTOR.cellOf(station.index)}`,
    },
    feeders: {
      A: { ...DEMO_TOPOLOGY.feeders.A!, units: [...station.feeders.A] },
      B: { ...DEMO_TOPOLOGY.feeders.B!, units: [...station.feeders.B] },
    },
  };
}

/** İndekse göre istasyon topolojisi (UI seçici). */
export function stationTopoByIndex(index: number): NovaTopology {
  const station = DEMO_STATIONS[index] ?? DEMO_STATIONS[0]!;
  return stationTopo(station);
}

const signedPcs = (p: { state: string; pMW: number }): number =>
  p.state === "dis" ? p.pMW : p.state === "chg" ? -p.pMW : 0;

/** Tüm saha state'ini bir istasyonun ünitelerine süz; fider/POI o istasyondan türetilir. */
export function stateForStation(state: NovaMimicState, station: DemoStation): NovaMimicState {
  const units = state.units.filter((u) => station.units.includes(u.n));
  const feederA = new Set(station.feeders.A);
  const feederMW: Record<string, number> = { A: 0, B: 0 };
  let poi = 0;
  // POI = Σ PCS − grup AUX (PMS hesabı; H03 sayaç haritası yok — M2).
  for (const u of units) {
    const own = u.pcs.reduce((b, p) => b + signedPcs(p), 0) - (u.aux?.kW ?? 0) / 1000;
    const f = feederA.has(u.n) ? "A" : "B";
    feederMW[f] = (feederMW[f] ?? 0) + own;
    poi += own;
  }
  return {
    ...state,
    station: state.stations?.[station.key] ?? state.station,
    units,
    feederMW,
    poiMW: poi,
  };
}

/** Toplam ünite sayısı config ile uyuşuyor mu (sanity). */
export function stationCoverage(): { units: number; expected: number } {
  const units = DEMO_STATIONS.reduce((a, s) => a + s.units.length, 0);
  return { units, expected: DEMO_UNIT_COUNT };
}

export interface StationGroup {
  station: DemoStation;
  /** Bu istasyona atanmış konteyner id'leri (backend `station` etiketinden). */
  containerIds: string[];
  /** Konteyner etiketi yoksa ilk konteynere düşüldü mü (fallback). */
  fallback: boolean;
}

/**
 * Konteyner kayıtlarındaki `station` etiketinden istasyon gruplarını türetir
 * (UC-13). Etiket yoksa (eski kurulum) tüm konteynerler her istasyona düşer
 * (mevcut tek-konteyner fan-out davranışı korunur).
 */
export function stationsForContainers(
  containers: ReadonlyArray<{ containerId: string; station?: string | null }>,
): StationGroup[] {
  const tagged = containers.filter((c) => typeof c.station === "string" && c.station.length > 0);
  if (tagged.length === 0) {
    const all = containers.map((c) => c.containerId);
    return DEMO_STATIONS.map((station) => ({ station, containerIds: all, fallback: true }));
  }
  const firstId = tagged[0]?.containerId;
  return DEMO_STATIONS.map((station) => {
    const ids = tagged.filter((c) => c.station === station.key).map((c) => c.containerId);
    if (ids.length > 0) return { station, containerIds: ids, fallback: false };
    return { station, containerIds: firstId ? [firstId] : [], fallback: true };
  });
}

/* ── Ana kaynak (PV) — İLLÜSTRATİF/statik (backend inverter verisi yok; gdems de
   simüle eder, tooltip M7 "value simulated"). Collector tipini kurulu güce göre
   belirlemek için kullanılır. ── */

export interface DemoSourceStation {
  readonly index: number;
  readonly key: string;
  readonly name: string;
  /** İnverter index'leri (INV-01…14). */
  readonly units: readonly number[];
  readonly unitMVA: number;
  /** Statik illüstratif istasyon AC gücü (MW). */
  readonly mw: number;
}

export const DEMO_SOURCE = {
  type: "solar" as const,
  capMWp: 60,
  prefix: "INV",
  unitMVA: 4.3,
  irr: 880,
  tMod: 35,
  /** Peak shaving eşiği (MW) — illüstratif. */
  peakMW: 20,
  stations: [
    { index: 0, key: "src1", name: "PV MV STATION #1", units: [0, 1, 2, 3, 4, 5, 6], unitMVA: 4.3, mw: 22.0 },
    { index: 1, key: "src2", name: "PV MV STATION #2", units: [7, 8, 9, 10, 11, 12, 13], unitMVA: 4.3, mw: 21.4 },
  ] as readonly DemoSourceStation[],
};

/** gdems `plantLayout`: kurulu > 50 MW → Metal Clad, değilse MV station. */
export function collectorType(installedMW: number): "Metal Clad" | "MV station" {
  return installedMW > DEMO_COLLECTOR.limitMW ? "Metal Clad" : "MV station";
}

/** Plant toplamları (BESS + illüstratif PV) + collector tipi. */
export function demoPlantTotals(): {
  bessMW: number;
  sourceMW: number;
  installedMW: number;
  collector: "Metal Clad" | "MV station";
} {
  const bessMW = DEMO_UNIT_COUNT * DEMO_TOPOLOGY.unit.banks.length * DEMO_TOPOLOGY.unit.pcsMaxMW;
  const sourceMW = DEMO_SOURCE.stations.reduce((a, s) => a + s.mw, 0);
  const installedMW = bessMW + sourceMW;
  return { bessMW, sourceMW, installedMW, collector: collectorType(installedMW) };
}
