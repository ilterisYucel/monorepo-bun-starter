import React from "react";
import { LogTerminal, SCADA_ICONS } from "@gd-monorepo/ui";
import * as S from "./EventsPage.styles";
import { useFilteredLogProvider } from "../hooks/useFilteredLogProvider";

const WarningIcon = SCADA_ICONS.logWarning;
const UserIcon = SCADA_ICONS.user;

export const EventsPage: React.FC = () => {
  const systemLogProvider = useFilteredLogProvider("system");
  const userActionLogProvider = useFilteredLogProvider("user");

  return (
    <S.EventsPageContainer>
      <S.EventsGrid>
        <S.EventsCard>
          <LogTerminal
            provider={systemLogProvider}
            maxHeight={800}
            title="Sistem Event & Hataları"
            titleIcon={<WarningIcon size={18} />}
          />
        </S.EventsCard>
        <S.EventsCard>
          <LogTerminal
            provider={userActionLogProvider}
            maxHeight={800}
            title="Kullanıcı Hareketleri"
            titleIcon={<UserIcon size={18} />}
          />
        </S.EventsCard>
      </S.EventsGrid>
    </S.EventsPageContainer>
  );
};