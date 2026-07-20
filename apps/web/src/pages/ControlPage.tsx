import React from "react";
import { ManeuverPanel } from "../features/control/components/ManeuverPanel";
import * as S from "./ControlPage.styles";

export const ControlPage: React.FC = () => {
  return (
    <S.ControlPageContainer>
      <ManeuverPanel />
    </S.ControlPageContainer>
  );
};
