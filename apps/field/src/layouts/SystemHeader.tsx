import React, { useEffect, useState } from "react";
import { SCADA_ICONS, COLORS, useTranslation } from "@gd-monorepo/ui";
import { useContainerData } from "../features/containers/hooks/useContainerData";
import { derivePcsRows } from "../features/dashboard/deriveDashboard";
import * as S from "./SystemHeader.styles";

interface SystemHeaderProps {
  fieldId?: string;
}

const ContainerIcon = SCADA_ICONS.container;
const ClockIcon = SCADA_ICONS.timer;
const PcsIcon = SCADA_ICONS.powerPlug;

export const SystemHeader: React.FC<SystemHeaderProps> = ({ fieldId = "—" }) => {
  const { t, locale } = useTranslation();
  const loc = locale();
  const [now, setNow] = useState(new Date());
  const { containers } = useContainerData(fieldId);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const onlineContainers = containers.filter((c) => c.connected).length;
  const totalContainers = containers.length;
  // Konteyner başına TEK PCS (2026-08-30): PCS sayacı snapshot PCS'lerinden
  // türetilir (konteyner sayısına eşitlenmiş varsayım yok).
  const pcsRows = derivePcsRows(containers);
  const pcsOnline = pcsRows.filter((p) => p.connected).length;
  const pcsTotal = pcsRows.length;

  return (
    <S.Bar>
      <S.Grid>
        <S.Box>
          <ContainerIcon size={16} />
          <S.Label>{t("field.label")} {fieldId}</S.Label>
        </S.Box>
        <S.Box>
          <ContainerIcon size={16} />
          <S.Label>{t("container.label")} {onlineContainers}/{totalContainers}</S.Label>
        </S.Box>
        <S.Box>
          <PcsIcon size={16} />
          <S.Label>{t("common.pcs")} {pcsOnline}/{pcsTotal}</S.Label>
        </S.Box>
        <S.Box>
          <ClockIcon size={16} />
          <S.Mono>{now.toLocaleString(loc, { hour: "2-digit", minute: "2-digit", second: "2-digit", day: "2-digit", month: "2-digit", year: "numeric" })}</S.Mono>
        </S.Box>
      </S.Grid>
    </S.Bar>
  );
};
