import type { TelemetryData } from "@gd-monorepo/shared-types";
import type { TrendPoint } from "@gd-monorepo/ui";

/**
 * Düz telemetri satırlarından trend serileri (SPEC UC-6/T-26, FR-6.1). Saf.
 *
 * Kaynak: field-tier downsampled (PCS/MV) — `unified/telemetry/downsampled`.
 * SOC BSC'den PCS BMS yüzüne akar; bu yüzden PCS `soc` canonical'ı kullanılır.
 * Eksik veri ilgili seriyi boş bırakır (uydurma yok).
 */

export interface DemoTrendData {
  soc: TrendPoint[];
  power: TrendPoint[];
  temp: TrendPoint[];
}

function aggregate(
  rows: TelemetryData[],
  pick: (row: TelemetryData) => number | undefined,
  reduce: (values: number[]) => number,
): TrendPoint[] {
  const buckets = new Map<string, number[]>();
  for (const row of rows) {
    const v = pick(row);
    if (v === undefined || !Number.isFinite(v)) continue;
    const list = buckets.get(row.timestamp);
    if (list) list.push(v);
    else buckets.set(row.timestamp, [v]);
  }
  return [...buckets.entries()]
    .map(([ts, values]) => ({ t: Date.parse(ts), value: reduce(values) }))
    .filter((p) => Number.isFinite(p.t))
    .sort((a, b) => a.t - b.t);
}

const avg = (xs: number[]): number => xs.reduce((a, b) => a + b, 0) / xs.length;
const sum = (xs: number[]): number => xs.reduce((a, b) => a + b, 0);
const max = (xs: number[]): number => Math.max(...xs);

const isNumber = (v: unknown): v is number => typeof v === "number";

/**
 * Trendlerin çektiği field-tier telemetri adları (downsampled `names` filtresi).
 * Bu filtre olmadan adapter tüm isimler için AVG üretir → dev sorgu > 60 sn
 * statement timeout (trend grafiği boş kalır). Kanonik eşleme aşağıda tags ile.
 */
export const TREND_SOURCE_NAMES = [
  "Battery Pack SOC",
  "Grid Active Power",
  "Highest Cell Temperature",
] as const;

/** Kanonik `max_cell_temp`, raf sıcaklık adı veya PCS hücre sıcaklığı. */
const isTempRow = (r: TelemetryData): boolean =>
  r.tags?.canonical === "max_cell_temp" ||
  /Rack Max Pack Temp R\d+$/.test(r.name) ||
  r.name === "Highest Cell Temperature";

export function buildTrendSeries(rows: TelemetryData[]): DemoTrendData {
  const soc = aggregate(
    rows.filter((r) => r.tags?.canonical === "soc"),
    (r) => (isNumber(r.value) ? r.value : undefined),
    avg,
  );

  const power = aggregate(
    rows.filter((r) => r.tags?.canonical === "power_kw"),
    (r) => (isNumber(r.value) ? r.value / 1000 : undefined),
    sum,
  );

  const temp = aggregate(
    rows.filter(isTempRow),
    (r) => (isNumber(r.value) ? r.value : undefined),
    max,
  );

  return { soc, power, temp };
}
