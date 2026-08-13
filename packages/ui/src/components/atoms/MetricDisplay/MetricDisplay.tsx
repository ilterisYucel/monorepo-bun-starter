import React from "react";
import { MetricBar } from "../MetricBar/MetricBar";
import * as S from "./MetricDisplay.styles";

export interface MetricDisplayProps {
  value: number;
  label: string;
  formattedValue: string;
}

export const MetricDisplay: React.FC<MetricDisplayProps> = ({
  value,
  label,
  formattedValue,
}) => (
  <S.MetricDisplayContainer>
    <S.MetricValue>{formattedValue}</S.MetricValue>
    <S.MetricLabel>{label}</S.MetricLabel>
    <MetricBar value={value} />
  </S.MetricDisplayContainer>
);

MetricDisplay.displayName = "MetricDisplay";
