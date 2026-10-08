import React, { useCallback, useLayoutEffect, useRef, useState } from "react";
import "./nova-console.css";

/**
 * Bağımlılıksız SVG trend grafiği — referans konsol `charts.js` birebir
 * (SPEC UC-3 / T-9..T-11). Saf çizim; veri app tarafında türetilir.
 *
 * Desteklenenler: faz (rest/HVAC) gölgelemesi, min–maks bandı, alan dolgusu,
 * kesikli setpoint serisi, limit çizgileri (hot/cold), y-etiketleri, saatlik
 * x-etiketleri, hover crosshair + tooltip + uç noktası. Veri yoksa "No data".
 */

export interface TrendPoint {
  t: number;
  value: number;
}

export interface TrendBand {
  lower: TrendPoint[];
  upper: TrendPoint[];
}

export interface TrendSeries {
  label: string;
  /** CSS renk ifadesi (ör. `var(--nm-c-soc)`). */
  color: string;
  points?: TrendPoint[];
  /** Verilirse iki kenar arası doldurulur (min–maks bandı). */
  band?: TrendBand;
  area?: boolean;
  dash?: boolean;
  hideLegend?: boolean;
}

export interface TrendLimit {
  value: number;
  label: string;
  cls?: "hot" | "cold";
}

export interface TrendPhase {
  t0: number;
  t1: number;
  kind: string;
}

export interface DemoTrendChartProps {
  title: string;
  unit: string;
  series: TrendSeries[];
  limits?: TrendLimit[];
  yMin?: number;
  yMax?: number;
  decimals?: number;
  /** Sol eksen payı (px) — uzun y-ekseni etiketleri için artırılabilir. */
  padLeft?: number;
  /** Grafik azami genişliği (px). */
  maxWidth?: number;
  /** Sabit y-tick değerleri; verilmezse [min, mid, max] üretilir. */
  yTicks?: number[];
  height?: number;
  phases?: TrendPhase[];
  /** Çizilecek faz türleri (ör. ["rest"]). */
  shade?: string[];
  shadeLabel?: Record<string, string>;
  valueFormat?: (v: number) => string;
}

const M_RIGHT = 8;
const M_TOP = 8;
const M_BOTTOM = 18;
const MIN_WIDTH = 260;

const fmt = (v: number, d = 1): string => (Math.round(v * 10 ** d) / 10 ** d).toFixed(d);
const hhmm = (ms: number): string => {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

/** En yakın örnek indeksini bulur (saf; test edilir). */
export function nearestIndex(points: TrendPoint[], t: number): number {
  let best = 0;
  let bestD = Number.POSITIVE_INFINITY;
  points.forEach((p, i) => {
    const d = Math.abs(p.t - t);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  });
  return best;
}

export const DemoTrendChart: React.FC<DemoTrendChartProps> = ({
  title,
  unit,
  series,
  limits = [],
  yMin,
  yMax,
  decimals = 1,
  padLeft,
  maxWidth,
  yTicks,
  height = 130,
  phases = [],
  shade = [],
  shadeLabel,
  valueFormat,
}) => {
  const plotRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(360);
  const [hover, setHover] = useState<{ px: number; index: number } | null>(null);

  useLayoutEffect(() => {
    const el = plotRef.current;
    if (!el) return;
    const measure = (): void => {
      const w = Math.max(MIN_WIDTH, el.clientWidth || 360);
      setWidth(w);
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const L = padLeft ?? 34;
  const W = width;
  const CH = height;

  const allPoints: TrendPoint[] = series.flatMap((s) => [
    ...(s.points ?? []),
    ...(s.band?.lower ?? []),
    ...(s.band?.upper ?? []),
  ]);
  const hasData = allPoints.length > 0;
  const ts = allPoints.map((p) => p.t);
  const t0 = hasData ? Math.min(...ts) : 0;
  const t1 = hasData ? Math.max(...ts) : 1;
  const values = allPoints.map((p) => p.value);
  const lo = yMin ?? (values.length ? Math.min(...values) : 0);
  const hi = yMax ?? (values.length ? Math.max(...values) : 1);
  const span = hi - lo || 1;
  const tSpan = t1 - t0 || 1;
  const iw = W - L - M_RIGHT;
  const ih = CH - M_TOP - M_BOTTOM;

  const x = (t: number): number => L + ((t - t0) / tSpan) * iw;
  const y = (v: number): number =>
    M_TOP + (1 - (Math.min(hi, Math.max(lo, v)) - lo) / span) * ih;

  const ticks = yTicks ?? [lo, lo + span / 2, hi];
  const isMs = t0 > 1e11;

  const primary = series.find((s) => (s.points?.length ?? 0) > 0);
  const xTicks: number[] = [];
  if (isMs && iw > 0) {
    const stepH = tSpan / 3600000 > 3 ? 2 : 1;
    const start = new Date(t0);
    start.setMinutes(0, 0, 0);
    for (let t = start.getTime(); t <= t1; t += stepH * 3600000) {
      if (t >= t0) xTicks.push(t);
    }
  }

  const onMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>): void => {
      if (!primary?.points?.length) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const rectW = rect.width || W;
      const px = ((e.clientX - rect.left) / rectW) * W;
      const t = t0 + ((px - L) / iw) * tSpan;
      setHover({ px, index: nearestIndex(primary.points, t) });
    },
    [primary, t0, tSpan, iw, L, W],
  );

  const hoverSample = hover && primary?.points ? primary.points[hover.index] : null;

  return (
    <div className="tc" style={{ minWidth: 0, ...(maxWidth !== undefined ? { maxWidth } : {}) }}>
      <div className="tc-head">
        <span className="tc-title">{title}</span>
        <span className="tc-legend">
          {series
            .filter((s) => !s.hideLegend)
            .map((s) => (
              <span key={s.label}>
                <i
                  className={`tc-key${s.band ? " tc-key-band" : ""}${s.dash ? " tc-key-dash" : ""}`}
                  style={{ background: s.color, color: s.color }}
                />
                {s.label}
              </span>
            ))}
        </span>
      </div>
      <div className="tc-plot" ref={plotRef}>
        <svg
          viewBox={`0 0 ${W} ${CH}`}
          width={W}
          height={CH}
          role="img"
          aria-label={title}
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
        >
          {/* faz gölgelemesi (rest/HVAC) */}
          {phases
            .filter((p) => shade.includes(p.kind))
            .map((p, i) => {
              const a = Math.max(t0, p.t0);
              const b = Math.min(t1, p.t1 ?? t1);
              if (b <= a) return null;
              const x1 = x(a);
              const w = x(b) - x1;
              return (
                <g key={`ph${i}`}>
                  <rect className="tc-phase" x={x1} y={M_TOP} width={w} height={ih} />
                  {w > 54 ? (
                    <text className="tc-phl" x={x1 + 4} y={M_TOP + ih - 5}>
                      {shadeLabel?.[p.kind] ?? p.kind}
                    </text>
                  ) : null}
                </g>
              );
            })}
          {/* y ızgarası + etiketler */}
          {ticks.map((v) => (
            <g key={`y${v}`}>
              <line className={`tc-grid${v === 0 ? " tc-zero" : ""}`} x1={L} x2={W - M_RIGHT} y1={y(v)} y2={y(v)} />
              <text className="tc-ax" x={L - 4} y={y(v) + 3} textAnchor="end">
                {fmt(v, 0)}
              </text>
            </g>
          ))}
          {/* x saat etiketleri */}
          {xTicks.map((t) => (
            <g key={`x${t}`}>
              <line className="tc-grid tc-vgrid" x1={x(t)} x2={x(t)} y1={M_TOP} y2={M_TOP + ih} />
              <text className="tc-ax" x={x(t)} y={CH - 6} textAnchor="middle">
                {isMs ? hhmm(t) : fmt(t, 0)}
              </text>
            </g>
          ))}
          {/* limit çizgileri */}
          {limits.map((l, i) => {
            const yy = y(l.value);
            if (yy < M_TOP || yy > CH - M_BOTTOM) return null;
            return (
              <g key={`lim${i}`}>
                <line className={`tc-limit ${l.cls ?? ""}`} x1={L} x2={W - M_RIGHT} y1={yy} y2={yy} />
                <text className="tc-limt" x={W - M_RIGHT - 4} y={yy - 4} textAnchor="end">
                  {l.label}
                </text>
              </g>
            );
          })}
          {/* seriler */}
          {series.map((s) => {
            const color = s.color;
            if (s.band) {
              const lower = s.band.lower;
              const upper = s.band.upper;
              if (!lower.length || !upper.length) return null;
              const top = upper.map((p) => `${x(p.t).toFixed(1)},${y(p.value).toFixed(1)}`);
              const bot = [...lower].reverse().map((p) => `${x(p.t).toFixed(1)},${y(p.value).toFixed(1)}`);
              return (
                <polygon key={s.label} className="tc-band" style={{ fill: color }} points={top.concat(bot).join(" ")} />
              );
            }
            const pts = s.points ?? [];
            if (pts.length === 0) return null;
            if (pts.length === 1) {
              return <circle key={s.label} cx={x(pts[0].t)} cy={y(pts[0].value)} r={2.5} fill={color} />;
            }
            const line = pts.map((p) => `${x(p.t).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
            return (
              <g key={s.label}>
                {s.area ? (
                  <polygon
                    className="tc-area"
                    style={{ fill: color }}
                    points={`${x(pts[0].t).toFixed(1)},${y(Math.max(lo, Math.min(hi, 0)))} ${line} ${x(pts[pts.length - 1].t).toFixed(1)},${y(Math.max(lo, Math.min(hi, 0)))}`}
                  />
                ) : null}
                <polyline className={`tc-line${s.dash ? " tc-dash" : ""}`} style={{ stroke: color }} points={line} />
              </g>
            );
          })}
          {/* uç noktası */}
          {primary?.points?.length && primary.color ? (
            <circle
              className="tc-end"
              style={{ fill: primary.color }}
              cx={x(primary.points[primary.points.length - 1].t)}
              cy={y(primary.points[primary.points.length - 1].value)}
              r={3.5}
            />
          ) : null}
          {/* hover crosshair + noktalar */}
          {hoverSample ? (
            <g>
              <line className="tc-cross" x1={x(hoverSample.t)} x2={x(hoverSample.t)} y1={M_TOP} y2={M_TOP + ih} />
              {series.map((s) => {
                const pts = s.points;
                if (!pts?.length) return null;
                const idx = nearestIndex(pts, hoverSample.t);
                return (
                  <circle key={`dot-${s.label}`} className="tc-dot" style={{ fill: s.color }} cx={x(pts[idx].t)} cy={y(pts[idx].value)} r={3.5} />
                );
              })}
            </g>
          ) : null}
        </svg>
        {!hasData ? <div className="tc-empty">No data</div> : null}
        {hoverSample ? (
          <div className="tc-tip" style={{ left: Math.min(x(hoverSample.t) + 12, Math.max(0, W - 180)) }}>
            <time>{isMs ? hhmm(hoverSample.t) : hoverSample.t}</time>
            {series.map((s) => {
              const pts = s.points;
              if (!pts?.length) return null;
              const idx = nearestIndex(pts, hoverSample.t);
              const v = pts[idx].value;
              return (
                <div key={`tip-${s.label}`}>
                  <i className={`tc-key${s.dash ? " tc-key-dash" : ""}`} style={{ background: s.color, color: s.color }} />
                  {s.label}
                  <b>{valueFormat ? valueFormat(v) : `${fmt(v, decimals)} ${unit}`}</b>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
};
