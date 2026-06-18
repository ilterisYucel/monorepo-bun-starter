// packages/ui/src/core/TelemetryGauge/TelemetryGauge.tsx
import React from "react";
import type { TelemetryGaugeProps } from "./TelemetryGauge.types";
import * as S from "./TelemetryGauge.styles";

// ---------- Speedometer arc helpers (angles from top, clockwise) ----------

const ARC_START = 240;
const ARC_SWEEP = 240;
const ARC_RADIUS = 48;
const ARC_WIDTH = 6;

function gaugeArc(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number,
): string {
  const rad = (deg: number) => ((deg - 90) * Math.PI) / 180;
  const sx = cx + r * Math.cos(rad(startAngle));
  const sy = cy + r * Math.sin(rad(startAngle));
  const ex = cx + r * Math.cos(rad(endAngle));
  const ey = cy + r * Math.sin(rad(endAngle));
  const large = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${sx} ${sy} A ${r} ${r} 0 ${large} 1 ${ex} ${ey}`;
}

function gaugeColor(pct: number): string {
  if (pct >= 80) return "#1d4ed8";
  if (pct >= 50) return "#3b82f6";
  return "#60a5fa";
}

// ---------- Component ----------

export const TelemetryGauge: React.FC<TelemetryGaugeProps> = ({
  value,
  min,
  max,
  label,
  unit: unitText,
  decimals = 1,
  color = "#3b82f6",
  size = "medium",
  icon,
  variant = "linear",
}) => {
  const hasLimits = min !== undefined || max !== undefined;
  const effectiveMin = min ?? 0;
  const effectiveMax = max ?? 100;
  const percentage = hasLimits
    ? Math.min(
        100,
        Math.max(
          0,
          ((value - effectiveMin) / (effectiveMax - effectiveMin)) * 100,
        ),
      )
    : 0;
  const formattedValue = value.toFixed(decimals);

  // ---------- Circular ----------
  if (variant === "circular") {
    const fillAngle = ARC_START + (percentage / 100) * ARC_SWEEP;

    return (
      <S.GaugeContainer size={size} $variant="circular" $bordered>
        {hasLimits && (
          <svg
            style={{
              position: "absolute",
              inset: 0,
              opacity: 0.4,
            }}
            viewBox="0 0 100 100"
          >
            <path
              d={gaugeArc(50, 50, ARC_RADIUS, ARC_START, ARC_START + ARC_SWEEP)}
              fill="none"
              stroke="rgba(255,255,255,0.12)"
              strokeWidth={ARC_WIDTH}
              strokeLinecap="round"
            />
            <path
              d={gaugeArc(50, 50, ARC_RADIUS, ARC_START, fillAngle)}
              fill="none"
              stroke={gaugeColor(percentage)}
              strokeWidth={ARC_WIDTH}
              strokeLinecap="round"
            />
          </svg>
        )}
        {icon && <S.CircularIcon size={size}>{icon}</S.CircularIcon>}
        <S.CircularLabel size={size}>{label}</S.CircularLabel>
        <S.CircularValueRow>
          <S.CircularValueNum size={size}>{formattedValue}</S.CircularValueNum>
          <S.CircularUnit>{unitText}</S.CircularUnit>
        </S.CircularValueRow>
        {hasLimits && (
          <>
            <S.CircularMin>{effectiveMin}</S.CircularMin>
            <S.CircularMax>{effectiveMax}</S.CircularMax>
          </>
        )}
      </S.GaugeContainer>
    );
  }

  // ---------- Linear ----------
  return (
    <S.GaugeContainer size={size}>
      {icon && <S.Icon>{icon}</S.Icon>}
      <S.Label size={size}>{label}</S.Label>
      <S.ValueContainer>
        <S.ValueNumber size={size}>{formattedValue}</S.ValueNumber>
        <S.Unit>{unitText}</S.Unit>
      </S.ValueContainer>
      {hasLimits && (
        <>
          <S.BarContainer>
            <S.BarFill
              style={{ width: `${percentage}%`, background: color }}
            />
          </S.BarContainer>
          <S.Limits>
            <span>{effectiveMin}</span>
            <span>{effectiveMax}</span>
          </S.Limits>
        </>
      )}
    </S.GaugeContainer>
  );
};
