import React from "react";
import * as S from "./ReportsPage.styles";

export const ReportsPage: React.FC = () => {
  return (
    <S.ReportsPageContainer>
      <S.ReportsPlaceholder>
        <S.PlaceholderIcon>📄</S.PlaceholderIcon>
        <p>Bu sayfa şu anda geliştirme aşamasındadır.</p>
        <p>
          Yakında eklenecek: PDF raporları, Excel export, grafik raporları...
        </p>
      </S.ReportsPlaceholder>
    </S.ReportsPageContainer>
  );
};
