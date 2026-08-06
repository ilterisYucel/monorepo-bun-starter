import React from "react";
import type { ContainerConnectionBadgeProps } from "./ContainerConnectionBadge.types";
import * as S from "./ContainerConnectionBadge.styles";

export const ContainerConnectionBadge: React.FC<ContainerConnectionBadgeProps> = ({
  connected,
  label,
  size = "medium",
}) => (
  <S.Badge $connected={connected} $size={size}>
    <S.Dot $connected={connected} />
    {connected ? label : "Bağlantı Yok"}
  </S.Badge>
);
