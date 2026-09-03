// packages/ui/src/core/TelemetryGauge/TelemetryGauge.tsx
import React from "react";
import type { TelemetryGaugeProps, GaugeTheme } from "./TelemetryGauge.types";
import * as S from "./TelemetryGauge.styles";
import { COLORS } from "../../colors";

// ---------- Speedometer arc helpers (angles from top, clockwise) ----------

const ARC_START = 240;
const ARC_SWEEP = 240;
const ARC_RADIUS = 48;
const ARC_WIDTH = 6;

/**
 * Tema paletleri — arc/bar/ikon tek kaynaktan beslenir (renk token sistemi).
 * dark/mid/light: pct >= 80 → dark, >= 50 → mid, gerisi light.
 */
export const GAUGE_THEMES: Record<
  GaugeTheme,
  { dark: string; mid: string; light: string }
> = {
  info: { dark: COLORS.infoDark, mid: COLORS.info, light: COLORS.infoLight },
  success: {
    dark: COLORS.successHover,
    mid: COLORS.success,
    light: COLORS.successGlow,
  },
  warning: {
    dark: COLORS.warningHover,
    mid: COLORS.warning,
    light: COLORS.warningGlow,
  },
  error: {
    dark: COLORS.errorHover,
    mid: COLORS.error,
    light: COLORS.errorStroke,
  },
  purple: {
    dark: COLORS.accentDark,
    mid: COLORS.textPurple,
    light: COLORS.accentLight,
  },
  temp: {
    dark: COLORS.tempHot,
    mid: COLORS.tempChilly,
    light: COLORS.tempCold,
  },
};

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

function gaugeColor(pct: number, theme: GaugeTheme): string {
  const palette = GAUGE_THEMES[theme];
  if (pct >= 80) return palette.dark;
  if (pct >= 50) return palette.mid;
  return palette.light;
}

// ---------- Component ----------

export const TelemetryGauge: React.FC<TelemetryGaugeProps> = ({
  value,
  min,
  max,
  label,
  unit: unitText,
  decimals = 1,
  color,
  size = "medium",
  icon,
  variant = "linear",
  width,
  theme = "info",
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
  const palette = GAUGE_THEMES[theme];
  const barColor = color ?? palette.mid;

  // ---------- Circular ----------
  if (variant === "circular") {
    const fillAngle = ARC_START + (percentage / 100) * ARC_SWEEP;
    const containerStyle: React.CSSProperties | undefined = width
      ? { width, height: width, minWidth: "unset", padding: 0, borderRadius: "50%", position: "relative", overflow: "hidden", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10 }
      : undefined;

    return (
      <S.GaugeContainer size={size} $variant="circular" $bordered style={containerStyle}>
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
              stroke={gaugeColor(percentage, theme)}
              strokeWidth={ARC_WIDTH}
              strokeLinecap="round"
            />
          </svg>
        )}
        {icon && (
          <S.CircularIcon size={size} style={{ color: palette.mid }}>
            {icon}
          </S.CircularIcon>
        )}
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
      {icon && <S.Icon style={{ color: palette.mid }}>{icon}</S.Icon>}
      <S.Label size={size}>{label}</S.Label>
      <S.ValueContainer>
        <S.ValueNumber size={size}>{formattedValue}</S.ValueNumber>
        <S.Unit>{unitText}</S.Unit>
      </S.ValueContainer>
      {hasLimits && (
        <>
          <S.BarContainer>
            <S.BarFill
              style={{ width: `${percentage}%`, background: barColor }}
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
