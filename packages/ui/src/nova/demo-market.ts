/**
 * Grid & Market saf hesapları (SPEC UC-9, FR-9.3..FR-9.4). TEİAŞ PFK P–f
 * (YH Ek-1), enerji/rezerv oranı ≥ 1.25 h ve frekans aralıkları (BU Tablo 1).
 * IO/hook yoktur — deterministik test.
 */

/** Sistem nominal frekansı (Hz). */
export const NOMINAL_HZ = 50;

/** P–f ölü bant (Hz) — deadband ≤ ±10 mHz. */
export const PF_DEADBAND_HZ = 0.01;

/** Tam rezervin verildiği sapma (Hz) — ±200 mHz. */
export const PF_FULL_AT_HZ = 0.2;

/** Enerji/rezerv oranı alt sınırı (h). */
export const PF_ENERGY_RATIO_H = 1.25;

const clamp = (v: number, lo: number, hi: number): number =>
  Math.max(lo, Math.min(hi, v));

/** PFK beklenen aktif güç tepkisi (MW); + = deşarj, − = şarj. */
export function pfResponseMW(
  fHz: number,
  reserveMW: number,
  fullAtHz = PF_FULL_AT_HZ,
  deadbandHz = PF_DEADBAND_HZ,
): number {
  if (Math.abs(fHz - NOMINAL_HZ) <= deadbandHz) return 0;
  return clamp((NOMINAL_HZ - fHz) / fullAtHz, -1, 1) * reserveMW;
}

/** P–f eğimi (MW/Hz) — Δf/ΔP tersi: tam rezerv / tam sapma. */
export function pfSlopeMWperHz(
  reserveMW: number,
  fullAtHz = PF_FULL_AT_HZ,
): number {
  return reserveMW / fullAtHz;
}

/** Enerji kontrolü: iki yönlü kullanılabilir enerji ≥ 1.25 × R mi. */
export function pfEnergyCheck(
  availableMWh: number,
  reserveMW: number,
  ratio = PF_ENERGY_RATIO_H,
): { ok: boolean; maxReserveMW: number; requiredMWh: number } {
  const maxReserveMW = ratio > 0 ? availableMWh / ratio : 0;
  return {
    ok: availableMWh >= ratio * reserveMW,
    maxReserveMW,
    requiredMWh: ratio * reserveMW,
  };
}

/** P–Q kabiliyeti (BU Art. 11 Şekil 6): |P|>0.1pu → |Q|≤0.4; yakın sıfırda |Q|≤1. */
export function pqWithinCapability(pPu: number, qPu: number): boolean {
  return Math.abs(pPu) > 0.1 ? Math.abs(qPu) <= 0.4 : Math.abs(qPu) <= 1;
}

export interface FreqRange {
  min: number;
  max: number;
  duration: string;
}

/** Frekans çalışma aralıkları (BU Tablo 1). */
export const FREQ_RANGES: FreqRange[] = [
  { min: 51.0, max: 51.5, duration: "30 dk" },
  { min: 49.0, max: 51.0, duration: "Sürekli" },
  { min: 48.5, max: 49.0, duration: "1 sa" },
  { min: 47.5, max: 48.5, duration: "30 dk" },
];

/** Verilen frekansın aralığını döner (yoksa undefined). */
export function freqRangeOf(fHz: number): FreqRange | undefined {
  return FREQ_RANGES.find((r) => fHz >= r.min && fHz < r.max);
}

export interface MarketPointLike {
  timestamp: string;
  value: number;
}

export interface MarketHour {
  h: number;
  ptf: number;
  gip: number;
  smf: number;
  dir: "YAT" | "YAL" | "DENGEDE";
}

export interface MarketSeriesInput {
  key: string;
  points: MarketPointLike[];
}

/**
 * Fiyat serilerini (ptf/gip_wap/smf) saat kovalarına indirger (saf). Son
 * değer saat başına alınır; eksik seri 0 kalır. `smf` işareti sistem yönünü
 * verir (+ YAT / − YAL / 0 DENGEDE).
 */
export function buildMarketDay(series: MarketSeriesInput[]): MarketHour[] {
  const hours: MarketHour[] = Array.from({ length: 24 }, (_, h) => ({
    h,
    ptf: 0,
    gip: 0,
    smf: 0,
    dir: "DENGEDE",
  }));
  const put = (key: string, points: MarketPointLike[]): void => {
    for (const p of points) {
      const d = new Date(p.timestamp);
      if (Number.isNaN(d.getTime())) continue;
      const h = d.getHours();
      if (h < 0 || h > 23) continue;
      if (key === "ptf") hours[h].ptf = p.value;
      else if (key === "gip_wap") hours[h].gip = p.value;
      else if (key === "smf") hours[h].smf = p.value;
    }
  };
  for (const s of series) put(s.key, s.points);
  for (const x of hours) x.dir = x.smf > 0 ? "YAT" : x.smf < 0 ? "YAL" : "DENGEDE";
  return hours;
}

/** Basit arbitraj planı: en ucuz `cycles` saat şarj, en pahalı `cycles` saat deşarj. */
export function arbitragePlan(
  hours: MarketHour[],
  cycles = 2,
): { cheap: number[]; dear: number[] } {
  const priced = hours.filter((x) => x.ptf > 0);
  if (priced.length <= cycles * 2) {
    const sorted = [...priced].sort((a, b) => a.ptf - b.ptf);
    return {
      cheap: sorted.slice(0, cycles).map((x) => x.h),
      dear: sorted.slice(-cycles).map((x) => x.h),
    };
  }
  const sorted = [...priced].sort((a, b) => a.ptf - b.ptf);
  return {
    cheap: sorted.slice(0, cycles).map((x) => x.h),
    dear: sorted.slice(-cycles).map((x) => x.h),
  };
}
