import React from "react";
import { LogTerminal, SCADA_ICONS } from "@gd-monorepo/ui";
import { useFieldLogProvider } from "../features/field-events/hooks/useFieldLogProvider";
import * as S from "./FieldEventsPage.styles";

const WarningIcon = SCADA_ICONS.logWarning;
const UserIcon = SCADA_ICONS.user;

export const FieldEventsPage: React.FC = () => {
  const systemLogProvider = useFieldLogProvider("system");
  const userActionLogProvider = useFieldLogProvider("user");

  return (
    <S.EventsGrid>
      <S.EventsCard>
        <LogTerminal
          provider={systemLogProvider}
          maxHeight={800}
          title="Sistem Event & Hataları"
          titleIcon={<WarningIcon size={18} />}
          tagFilters={[{ tagKey: "container_id", label: "Konteyner" }]}
        />
      </S.EventsCard>
      <S.EventsCard>
        <LogTerminal
          provider={userActionLogProvider}
          maxHeight={800}
          title="Kullanıcı Hareketleri"
          titleIcon={<UserIcon size={18} />}
          tagFilters={[{ tagKey: "container_id", label: "Konteyner" }]}
        />
      </S.EventsCard>
    </S.EventsGrid>
  );
};
