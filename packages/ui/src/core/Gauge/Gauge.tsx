// packages/ui/src/core/Gauge/Gauge.tsx
import React from "react";
import type { GaugeProps } from "./Gauge.types";
import * as S from "./Gauge.styles";

export const Gauge: React.FC<GaugeProps> = ({
  value,
  min = 0,
  max = 100,
  label,
  unit: unitText,
  decimals = 1,
  color = "#3b82f6",
  size = "medium",
  icon,
}) => {
  const percentage = Math.min(
    100,
    Math.max(0, ((value - min) / (max - min)) * 100),
  );
  const formattedValue = value.toFixed(decimals);

  return (
    <S.GaugeContainer size={size}>
      {icon && <S.Icon>{icon}</S.Icon>}
      <S.Label size={size}>{label}</S.Label>
      <S.ValueContainer>
        <S.ValueNumber size={size}>{formattedValue}</S.ValueNumber>
        <S.Unit>{unitText}</S.Unit>
      </S.ValueContainer>
      <S.BarContainer>
        <S.BarFill style={{ width: `${percentage}%`, background: color }} />
      </S.BarContainer>
      <S.Limits>
        <span>{min}</span>
        <span>{max}</span>
      </S.Limits>
    </S.GaugeContainer>
  );
};
