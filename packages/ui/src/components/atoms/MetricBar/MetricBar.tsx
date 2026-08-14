import React from "react";
import * as S from "./MetricBar.styles";

export interface MetricBarProps {
  value: number;
  max?: number;
}

export const MetricBar: React.FC<MetricBarProps> = ({ value, max = 100 }) => {
  const pct = Math.min(max, Math.max(0, value || 0));
  return (
    <S.MetricBarContainer>
      <S.MetricBarFill style={{ width: `${pct}%` }} />
    </S.MetricBarContainer>
  );
};

MetricBar.displayName = "MetricBar";
