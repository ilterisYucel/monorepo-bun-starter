import React from "react";
import type { ReactNode } from "react";
import * as S from "./CardHeader.styles";

export interface CardHeaderProps {
  name: string;
  badges?: ReactNode;
  children?: ReactNode;
}

export const CardHeader: React.FC<CardHeaderProps> = ({ name, badges, children }) => (
  <S.CardHeaderContainer>
    <S.CardName>{name}</S.CardName>
    {badges && <S.CardBadges>{badges}</S.CardBadges>}
    {children}
  </S.CardHeaderContainer>
);

CardHeader.displayName = "CardHeader";
