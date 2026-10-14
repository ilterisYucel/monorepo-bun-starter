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
  readonly feeder: "A" | "B";
  readonly cell: string;
  readonly units: readonly number[];
}

/** Collector (grid ile istasyonlar arası ortak bara) — 31.05 MW ≤ 50 → MV STATION. */
export const DEMO_COLLECTOR = {
  name: "MV STATION",
  label: "MV STATION · 34.5 kV",
  limitMW: 50,
  /** İstasyon fider hücresi (Q01 incomer, Q02 metering; Q04/Q05 istasyon fiderleri). */
  cellOf: (index: number): string => `Q0${index + 4}`,
} as const;

export const DEMO_STATIONS: readonly DemoStation[] = [
  { index: 0, key: "bess1", name: "BESS MV STATION #1", feeder: "A", cell: "H04", units: DEMO_TOPOLOGY.feeders.A.units },
  { index: 1, key: "bess2", name: "BESS MV STATION #2", feeder: "B", cell: "H05", units: DEMO_TOPOLOGY.feeders.B.units },
];

/** Ünite numarası hangi istasyonda? */
export function stationForUnit(n: number): DemoStation | undefined {
  return DEMO_STATIONS.find((s) => s.units.includes(n));
}

/** İstasyonun ünite listesi (state süzme için). */
export function stationUnits(station: DemoStation): number[] {
  return [...station.units];
}

/** İstasyon topolojisi: DEMO_TOPOLOGY'nin yalnız o istasyonun fider dilimi. */
export function stationTopo(station: DemoStation): NovaTopology {
  const feeder = DEMO_TOPOLOGY.feeders[station.feeder];
  return {
    ...DEMO_TOPOLOGY,
    station: {
      ...DEMO_TOPOLOGY.station,
      name: station.name,
      poiLabel: `TO ${DEMO_COLLECTOR.name} ${DEMO_COLLECTOR.cellOf(station.index)}`,
    },
    feeders: { [station.feeder]: { ...feeder, units: [...feeder.units] } },
  };
}

/** İndekse göre istasyon topolojisi (UI seçici). */
export function stationTopoByIndex(index: number): NovaTopology {
  const station = DEMO_STATIONS[index] ?? DEMO_STATIONS[0];
  return stationTopo(station);
}

const signedPcs = (p: { state: string; pMW: number }): number =>
  p.state === "dis" ? p.pMW : p.state === "chg" ? -p.pMW : 0;

/** Tüm saha state'ini bir istasyonun ünitelerine süz; fider/POI o istasyondan türetilir. */
export function stateForStation(state: NovaMimicState, station: DemoStation): NovaMimicState {
  const units = state.units.filter((u) => station.units.includes(u.n));
  const mw = units.reduce((a, u) => a + u.pcs.reduce((b, p) => b + signedPcs(p), 0), 0);
  return {
    ...state,
    units,
    feederMW: { [station.feeder]: mw },
    poiMW: mw,
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
