import React from "react";
import * as S from "./SectionHeader.styles";

export interface SectionHeaderProps {
  title: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({ title }) => (
  <S.SectionHeaderContainer>
    <S.SectionTitle>{title}</S.SectionTitle>
  </S.SectionHeaderContainer>
);

SectionHeader.displayName = "SectionHeader";
