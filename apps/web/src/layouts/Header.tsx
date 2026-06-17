import React from "react";
import * as S from "./Header.styles";

interface HeaderProps {
  pageTitle: string;
}

export const Header: React.FC<HeaderProps> = ({ pageTitle }) => {
  return (
    <S.AppHeader>
      <S.PageTitle>{pageTitle}</S.PageTitle>
    </S.AppHeader>
  );
};
