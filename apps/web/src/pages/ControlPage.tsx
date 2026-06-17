import React from "react";

import * as S from "./ControlPage.styles";
import { useChargeStatus } from "../hooks/useChargeStatus";
import { ControlPanel } from "../features/control/components/ControlPanel";
import { Scheduler } from "../features/control/components/Scheduler";

export const ControlPage: React.FC = () => {
  const { chargeStatus } = useChargeStatus();

  const handleCommandSent = () => {};

  return (
    <S.ControlPageContainer>
      <S.ControlGrid>
        <ControlPanel
          currentChargeStatus={chargeStatus}
          onCommandSent={handleCommandSent}
        />
        <Scheduler />
      </S.ControlGrid>
    </S.ControlPageContainer>
  );
};
