import React, { useEffect, useState } from "react";
import { SCADA_ICONS, COLORS } from "@gd-monorepo/ui";
import { useContainerData } from "../features/containers/hooks/useContainerData";
import * as S from "./SystemHeader.styles";

interface SystemHeaderProps {
  fieldId?: string;
}

const ContainerIcon = SCADA_ICONS.container;
const OnlineIcon = SCADA_ICONS.statusOnline;
const OfflineIcon = SCADA_ICONS.statusOffline;
const ClockIcon = SCADA_ICONS.timer;

const formatClock = (d: Date): string =>
  d.toLocaleString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

export const SystemHeader: React.FC<SystemHeaderProps> = ({ fieldId = "—" }) => {
  const [now, setNow] = useState(new Date());
  const { containers } = useContainerData(fieldId);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const onlineContainers = containers.filter((c) => c.connected).length;
  const totalContainers = containers.length;
  const ppcConnected = onlineContainers > 0;
  const PPCIcon = ppcConnected ? OnlineIcon : OfflineIcon;
  const ppcColor = ppcConnected ? COLORS.success : COLORS.error;
  const ppcLabel = ppcConnected ? "PPC: Bağlı" : "PPC: Bağlantı Yok";

  return (
    <S.Bar>
      <S.Grid>
        <S.Box>
          <ContainerIcon size={16} />
          <S.Label>Saha: {fieldId}</S.Label>
        </S.Box>
        <S.Box>
          <PPCIcon size={16} color={ppcColor} />
          <S.Label style={{ color: ppcColor }}>{ppcLabel}</S.Label>
        </S.Box>
        <S.Box>
          <ContainerIcon size={16} />
          <S.Label>Konteyner: {onlineContainers}/{totalContainers}</S.Label>
        </S.Box>
        <S.Box>
          <ClockIcon size={16} />
          <S.Mono>{formatClock(now)}</S.Mono>
        </S.Box>
      </S.Grid>
    </S.Bar>
  );
};
