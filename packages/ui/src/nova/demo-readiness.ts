import type { NovaStationState } from "./mimic-types";
import { POS_TEXT } from "./nova-mimic";
/**
 * Ready/Rest saf türevleri (SPEC UC-7, FR-7.3, K7). IO/hook yoktur; `now`
 * dışarıdan verilir → deterministik test. Dinlenme eşiği 2 saat (LGES).
 */

/** Demo dinlenme eşiği (dk) — K7/A5 kararı (2026-10-07). */
export const DEMO_REST_MINUTES = 120; // LGES: tam şarj/deşarj sonrası 2 saat dinlenme

/**
 * Dinlenme özelliği anahtarı — 2026-10-15 sahibi kararı: dinlenme süresi
 * ŞİMDİLİK TAMAMEN KALDIRILDI (kart, trend gölgesi, KPI "Rest" modu yok).
 * Yeniden açmak için true yapılır; türev fonksiyonlar korunur.
 */
export const DEMO_REST_ENABLED = false;

const REST_RUN_NAMES = new Set(["full_charge", "full_discharge"]);

export interface RestState {
  finishedAt?: string;
  elapsedMinutes?: number;
  requiredMinutes: number;
  /** Dinlenme eşiği doldu mu. */
  complete: boolean;
}

/** Son tam şarj/deşarj run'ının bitiş zamanı (en yeni). Yoksa undefined. */
export function lastFullRunFinishedAt(
  runs: Array<{ name: string; finishedAt: string | null }>,
): string | undefined {
  let best: string | undefined;
  for (const r of runs) {
    if (!REST_RUN_NAMES.has(r.name) || !r.finishedAt) continue;
    if (best === undefined || r.finishedAt > best) best = r.finishedAt;
  }
  return best;
}

/** Dinlenme durumu: son tam şarj/deşarj bitişinden geçen süre ≥ eşik mi. */
export function deriveRestState(
  finishedAt: string | undefined,
  nowMs: number,
  requiredMinutes = DEMO_REST_MINUTES,
): RestState {
  if (!finishedAt) return { requiredMinutes, complete: false };
  const end = Date.parse(finishedAt);
  if (Number.isNaN(end)) return { requiredMinutes, complete: false };
  const elapsedMinutes = Math.max(0, (nowMs - end) / 60000);
  return { finishedAt, elapsedMinutes, requiredMinutes, complete: elapsedMinutes >= requiredMinutes };
}

/** Termal hazırlık: tüm raf sıcaklıkları 19–25 °C bandında mı (#66). */
export function thermalReady(
  banks: Array<{ tmax: number; tmin?: number }>,
  limits: { tempMin: number; tempMax: number },
): boolean {
  if (banks.length === 0) return false;
  return banks.every((b) => {
    const lo = b.tmin ?? b.tmax;
    return lo >= limits.tempMin && b.tmax <= limits.tempMax;
  });
}

export interface RestPhase {
  t0: number;
  t1: number;
  kind: "rest";
}

/**
 * Tam şarj/deşarj bitişlerinden dinlenme fazları (trend gölgelemesi, UC-3).
 * Her run bitişinden `restMinutes` boyunca bir faz üretir (saf).
 */
export function restPhasesForRuns(
  runs: Array<{ name: string; finishedAt: string | null }>,
  restMinutes = DEMO_REST_MINUTES,
): RestPhase[] {
  const out: RestPhase[] = [];
  for (const r of runs) {
    if (!REST_RUN_NAMES.has(r.name) || !r.finishedAt) continue;
    const t0 = Date.parse(r.finishedAt);
    if (Number.isNaN(t0)) continue;
    out.push({ t0, t1: t0 + restMinutes * 60_000, kind: "rest" });
  }
  return out.sort((a, b) => a.t0 - b.t0);
}

/* ── Grup hazırlık eksenleri (referans `groupChecks` portu) ───────────────── */

export type GroupAxisKey = "mv" | "bsc" | "pcs" | "temp" | "rest" | "safe" | "cal";

/** Gösterim sırası + kısa etiketler (referans `READY_AXES`). */
export const GROUP_AXES: ReadonlyArray<readonly [GroupAxisKey, string]> = [
  ["mv", "MV"],
  ["bsc", "BSC"],
  ["pcs", "PCS"],
  ["temp", "Temp"],
  ["rest", "Rest"],
  ["safe", "Safety"],
  ["cal", "Cal."],
];

export interface GroupAxis {
  ok: boolean;
  /** Kısmi (ör. bazı PCS hazır) → sarı. */
  warn?: boolean;
  /** Veri henüz yok (gösterimde gri). */
  pending?: boolean;
  text: string;
}

export interface GroupChecks {
  axes: Record<GroupAxisKey, GroupAxis>;
  ok: boolean;
  /** Hazır ama kısıtlı (ör. bazı PCS arızalı). */
  reduced: boolean;
  /** Gösterilecek ilk engel / kısıt metni. */
  first: string;
  /** Bakım/izolasyon → kart soluk gösterilir. */
  muted: boolean;
}

export interface GroupCheckInput {
  unit: NovaUnitState;
  limits: { tempMin: number; tempMax: number };
  /** MV yolu topraklamasız mı (permissives'ten). */
  earthingOk: boolean;
  /** Dinlenme süresi uygulanıyor mu (Admin ayarı). */
  restApplied: boolean;
  /** Dinlenme tamam mı. */
  restComplete: boolean;
}

const isPcsReady = (state: string | undefined): boolean => state !== "fault" && state !== "off";

/**
 * Sorgu — grubun **tüm eksenlerde** hazır olup olmadığı (referans `groupChecks`).
 *
 * Eksenler: MV yolu · BSC (online + Normal) · PCS (fault/off değil) · sıcaklık bandı ·
 * dinlenme · güvenlik (fault/bakım) · kalibrasyon (veri yok → `pending`).
 * Kısmi PCS → `reduced` (READY · REDUCED). İlk engel `first` metnindedir.
 */
export function deriveGroupChecks(input: GroupCheckInput): GroupChecks {
  const { unit, limits, earthingOk, restApplied, restComplete } = input;
  const banks = unit.banks;
  const L = limits;

  const mvOk = earthingOk && unit.rmu.H02 === "closed";
  const bscOk = banks.length > 0 && banks.every((b) => b.online !== 0 && b.bscState === 3);
  const pcsReady = unit.pcs.filter((p, i) => isPcsReady(p.state) && (banks[i]?.online ?? 1) !== 0).length;
  const pcsOk = unit.pcs.length > 0 && pcsReady === unit.pcs.length;
  const pcsWarn = !pcsOk && pcsReady > 0;
  const tempOk = thermalReady(banks, L);
  const hot = banks.length ? Math.max(...banks.map((b) => b.tmax)) : NaN;
  const cold = banks.length ? Math.min(...banks.map((b) => b.tmin ?? b.tmax)) : NaN;
  const restOk = !restApplied || restComplete;
  const sev = unit.status?.sev ?? null;
  const safeOk = sev !== "alarm" && sev !== "maint";

  const axes: Record<GroupAxisKey, GroupAxis> = {
    mv: {
      ok: mvOk,
      text: mvOk ? "H01 · feeder CB · RMU H02 closed, no earthing in path" : "MV path open or earthing switch closed",
    },
    bsc: {
      ok: bscOk,
      text: bscOk
        ? `${banks.length}/${banks.length} BSC Normal (30036 = 3), racks online`
        : `${banks.filter((b) => b.online !== 0 && b.bscState === 3).length}/${banks.length} BSC Normal with racks online`,
    },
    pcs: {
      ok: pcsOk,
      ...(pcsWarn ? { warn: true as const } : {}),
      text: `${pcsReady}/${unit.pcs.length} PCS ready`,
    },
    temp: {
      ok: tempOk,
      text: tempOk
        ? `${cold.toFixed(1)}–${hot.toFixed(1)} °C inside ${L.tempMin}–${L.tempMax} °C`
        : hot > L.tempMax
          ? `${hot.toFixed(1)} °C > ${L.tempMax} °C`
          : `${cold.toFixed(1)} °C < ${L.tempMin} °C`,
    },
    rest: {
      ok: restOk,
      text: !restApplied
        ? "rest time not applied"
        : restComplete
          ? "rest time complete"
          : "rest time still running — held until it ends",
    },
    safe: {
      ok: safeOk,
      text: safeOk ? "no active fault · FSS normal · not in maintenance" : (unit.status?.text ?? "fault or maintenance active"),
    },
    cal: {
      ok: true,
      pending: true,
      text: "calibration data not available yet",
    },
  };

  const order: GroupAxisKey[] = ["safe", "mv", "bsc", "pcs", "temp", "rest", "cal"];
  // Kısmi (warn) eksenler engel sayılmaz → READY · REDUCED.
  const failing = order.find((k) => !axes[k].ok && axes[k].pending !== true && axes[k].warn !== true);
  const reduced = pcsWarn;
  return {
    axes,
    ok: failing === undefined,
    reduced,
    first: failing !== undefined ? axes[failing].text : reduced ? axes.pcs.text : "",
    muted: sev === "maint",
  };
}

/* ── Saha (plant) hazırlık kontrolleri (referans `plant-ready` satırları) ──── */

export interface PlantCheck {
  ok: boolean;
  label: string;
  /** Sağ hizalı canlı ölçüm/değer. */
  detail: string;
}

export interface PlantCheckInput {
  station: NovaStationState;
  /** AUX enerji analizörü gerilimi (V) — 0/undefined → besleme yok. */
  auxVoltage?: number;
  /** Kritik (alarm) uyarı sayısı. */
  criticalFaults?: number;
}

const f2 = (v: number, d = 2): string => (Math.round(v * 10 ** d) / 10 ** d).toFixed(d);

/**
 * Sorgu — saha hazırlık satırları (referans `renderReady` site-chk).
 *
 * Sıra: Site status (FL-01) · Grid at H03 · Incomer H01 · AUX supply · Plant mode.
 * Sağdaki `detail` **canlı ölçüm** taşır (kV/Hz, V, şalter pozisyonu).
 */
export function derivePlantChecks(input: PlantCheckInput): PlantCheck[] {
  const st = input.station;
  const critical = input.criticalFaults ?? 0;
  const siteOk = st.H01 === "closed" && critical === 0;
  const gridOk = st.kV > 31 && st.kV < 38 && Math.abs(st.hz - 50) < 0.2;
  const auxV = input.auxVoltage ?? 0;
  return [
    { ok: siteOk, label: "Site status (FL-01)", detail: siteOk ? "Ready" : "Not Ready" },
    { ok: gridOk, label: "Grid at H03", detail: `${f2(st.kV)} kV · ${f2(st.hz)} Hz` },
    { ok: st.H01 === "closed", label: "Incomer H01", detail: POS_TEXT[st.H01] },
    { ok: auxV > 0, label: "AUX supply", detail: auxV > 0 ? `${Math.round(auxV)} V` : "no supply" },
    { ok: true, label: "Plant mode", detail: "Manual" },
  ];
}
