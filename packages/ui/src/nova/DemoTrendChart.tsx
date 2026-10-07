import React from "react";
import { COLORS_LIGHT } from "../colors/tokensLight";

/**
 * Bağımlılıksız SVG trend grafiği (SPEC UC-6/T-27). Seriler app tarafında
 * türetilir; bu bileşen yalnız çizer. Veri yoksa boş durum gösterir.
 */

export interface TrendPoint {
  t: number;
  value: number;
}

export interface TrendSeries {
  label: string;
  points: TrendPoint[];
  color: string;
  area?: boolean;
  dash?: boolean;
}

export interface TrendLimit {
  value: number;
  label: string;
  cls?: "hot" | "cold";
}

export interface DemoTrendChartProps {
  title: string;
  unit: string;
  series: TrendSeries[];
  limits?: TrendLimit[];
  yMin?: number;
  yMax?: number;
  decimals?: number;
}

const CW = 360;
const CH = 130;
const PAD = { l: 34, r: 8, t: 8, b: 18 };

const fmt = (v: number, d = 1): string =>
  (Math.round(v * 10 ** d) / 10 ** d).toFixed(d).replace(".", ",");

export const DemoTrendChart: React.FC<DemoTrendChartProps> = ({
  title,
  unit,
  series,
  limits = [],
  yMin,
  yMax,
  decimals = 1,
}) => {
  const allPoints = series.flatMap((s) => s.points);
  const hasData = allPoints.length > 0;
  const ts = allPoints.map((p) => p.t);
  const t0 = hasData ? Math.min(...ts) : 0;
  const t1 = hasData ? Math.max(...ts) : 1;
  const values = allPoints.map((p) => p.value);
  const lo = yMin ?? (values.length ? Math.min(...values) : 0);
  const hi = yMax ?? (values.length ? Math.max(...values) : 1);
  const span = hi - lo || 1;
  const tSpan = t1 - t0 || 1;

  const px = (t: number): number => PAD.l + ((t - t0) / tSpan) * (CW - PAD.l - PAD.r);
  const py = (v: number): number => PAD.t + (1 - (v - lo) / span) * (CH - PAD.t - PAD.b);

  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, marginBottom: 2 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: COLORS_LIGHT.fg }}>{title}</span>
        <span style={{ fontSize: 11.5, color: COLORS_LIGHT.muted }}>{unit}</span>
      </div>
      <div style={{ position: "relative" }}>
        <svg viewBox={`0 0 ${CW} ${CH}`} style={{ display: "block", maxWidth: "100%", height: "auto" }}>
          {/* yatay ızgara */}
          {[0, 0.5, 1].map((f) => {
            const y = PAD.t + f * (CH - PAD.t - PAD.b);
            const val = hi - f * span;
            return (
              <g key={f}>
                <line x1={PAD.l} x2={CW - PAD.r} y1={y} y2={y} stroke={COLORS_LIGHT.line2} strokeWidth={1} />
                <text x={PAD.l - 4} y={y + 3} textAnchor="end" fontSize={9} fill={COLORS_LIGHT.muted} fontFamily='"IBM Plex Mono", monospace'>
                  {fmt(val, decimals)}
                </text>
              </g>
            );
          })}
          {/* limit çizgileri */}
          {limits.map((l, i) => {
            const y = py(l.value);
            if (y < PAD.t || y > CH - PAD.b) return null;
            const color = l.cls === "hot" ? COLORS_LIGHT.alarm : l.cls === "cold" ? COLORS_LIGHT.cold : COLORS_LIGHT.muted;
            return (
              <g key={`lim${i}`}>
                <line x1={PAD.l} x2={CW - PAD.r} y1={y} y2={y} stroke={color} strokeDasharray="5 4" strokeWidth={1} />
                <text x={CW - PAD.r} y={y - 2} textAnchor="end" fontSize={9} fill={color} fontFamily='"IBM Plex Mono", monospace'>
                  {l.label}
                </text>
              </g>
            );
          })}
          {/* seriler */}
          {series.map((s) =>
            s.points.length > 1 ? (
              <polyline
                key={s.label}
                fill="none"
                stroke={s.color}
                strokeWidth={s.dash ? 1.5 : 2}
                strokeDasharray={s.dash ? "5 4" : undefined}
                strokeLinejoin="round"
                strokeLinecap="round"
                points={s.points.map((p) => `${px(p.t)},${py(p.value)}`).join(" ")}
              />
            ) : s.points.length === 1 ? (
              <circle key={s.label} cx={px(s.points[0].t)} cy={py(s.points[0].value)} r={2.5} fill={s.color} />
            ) : null,
          )}
        </svg>
        {!hasData ? (
          <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: COLORS_LIGHT.dim, fontSize: 12.5 }}>
            veri yok
          </div>
        ) : null}
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", fontSize: 11.5, color: COLORS_LIGHT.muted, marginTop: 2 }}>
        {series.map((s) => (
          <span key={s.label} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
            <span style={{ display: "inline-block", width: 14, height: 2.5, borderRadius: 2, background: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
};
