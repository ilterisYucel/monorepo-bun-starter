import React from "react";
import type { ReactNode } from "react";
import * as S from "./DataRow.styles";

export interface DataRowProps {
  icon: ReactNode;
  label: string;
  value: string;
}

export const DataRow: React.FC<DataRowProps> = ({ icon, label, value }) => (
  <S.DataRowContainer>
    <S.DataIcon>{icon}</S.DataIcon>
    <S.DataLabel>{label}</S.DataLabel>
    <S.DataValue>{value}</S.DataValue>
  </S.DataRowContainer>
);

DataRow.displayName = "DataRow";
