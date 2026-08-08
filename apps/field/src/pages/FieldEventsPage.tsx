import React from "react";
import { LogTerminal, SCADA_ICONS, useTranslation } from "@gd-monorepo/ui";
import { useFieldLogProvider } from "../features/field-events/hooks/useFieldLogProvider";
import * as S from "./FieldEventsPage.styles";

const WarningIcon = SCADA_ICONS.logWarning;
const UserIcon = SCADA_ICONS.user;

export const FieldEventsPage: React.FC = () => {
  const { t } = useTranslation();
  const systemLogProvider = useFieldLogProvider("system");
  const userActionLogProvider = useFieldLogProvider("user");

  const containerFilter = [{ tagKey: "container_id", label: t("container.title") }];

  return (
    <S.EventsGrid>
      <S.EventsCard>
        <LogTerminal
          provider={systemLogProvider}
          maxHeight={800}
          title={t("page.systemEvents")}
          titleIcon={<WarningIcon size={18} />}
          tagFilters={containerFilter}
        />
      </S.EventsCard>
      <S.EventsCard>
        <LogTerminal
          provider={userActionLogProvider}
          maxHeight={800}
          title={t("chart.control.userActions")}
          titleIcon={<UserIcon size={18} />}
          tagFilters={containerFilter}
        />
      </S.EventsCard>
    </S.EventsGrid>
  );
};
