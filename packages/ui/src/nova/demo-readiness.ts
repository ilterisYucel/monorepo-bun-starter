/**
 * Ready/Rest saf türevleri (SPEC UC-7, FR-7.3, K7). IO/hook yoktur; `now`
 * dışarıdan verilir → deterministik test. Dinlenme eşiği demo için 30 dk.
 */

/** Demo dinlenme eşiği (dk) — K7/A5 kararı (2026-10-07). */
export const DEMO_REST_MINUTES = 30;

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
