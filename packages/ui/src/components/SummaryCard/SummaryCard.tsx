import React from "react";
import type { SummaryCardProps } from "./SummaryCard.types";
import * as S from "./SummaryCard.styles";

export const SummaryCard: React.FC<SummaryCardProps> = ({
  icon,
  value,
  label,
  variant,
}) => (
  <S.Container $variant={variant}>
    <S.Icon>{icon}</S.Icon>
    <S.Value $variant={variant}>{value}</S.Value>
    <S.Label $variant={variant}>{label}</S.Label>
  </S.Container>
);

SummaryCard.displayName = "SummaryCard";
