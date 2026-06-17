// packages/ui/src/core/TelemetryGauge/TelemetryGauge.tsx
import React from "react";
import type { TelemetryGaugeProps } from "./TelemetryGauge.types";
import * as S from "./TelemetryGauge.styles";

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
    return (
      <S.GaugeContainer size={size} $variant="circular" $bordered>
        {icon && <S.CircularIcon size={size}>{icon}</S.CircularIcon>}
        <S.CircularLabel size={size}>{label}</S.CircularLabel>
        <S.CircularValueRow>
          <S.CircularValueNum size={size}>{formattedValue}</S.CircularValueNum>
          <S.CircularUnit>{unitText}</S.CircularUnit>
        </S.CircularValueRow>
        {hasLimits && (
          <S.CircularLimits>
            {effectiveMin} / {effectiveMax}
          </S.CircularLimits>
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
