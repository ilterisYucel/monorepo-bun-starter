import React from "react";
import * as S from "./Card.styles";

export interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({ children, className, onClick }) => (
  <S.CardContainer className={className} onClick={onClick} style={onClick ? { cursor: "pointer" } : undefined}>
    {children}
  </S.CardContainer>
);

Card.displayName = "Card";
