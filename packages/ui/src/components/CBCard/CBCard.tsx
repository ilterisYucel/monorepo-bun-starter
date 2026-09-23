import React from "react";
import { SCADA_ICONS } from "../../icons";
import { COLORS } from "../../colors";
import type { CBCardProps, CBCardLabels } from "./CBCard.types";
import * as S from "./CBCard.styles";

const StatusOnlineIcon = SCADA_ICONS.statusOnline;
const StatusOfflineIcon = SCADA_ICONS.statusOffline;
const CBIcon = SCADA_ICONS.circuitBreaker;

const DEFAULT_TR: CBCardLabels = {
  online: "Çevrimiçi",
  offline: "Çevrimdışı",
  closed: "Kapalı",
  open: "Açık",
  detail: "Cihaz Detayları",
};

export const CBCard: React.FC<CBCardProps> = ({
  name,
  status,
  isClosed,
  isOpen,
  onDetailClick,
  labels: rawLabels,
}) => {
  const L = rawLabels ?? DEFAULT_TR;
  const StatusBadge = status === "online" ? S.BadgeOnline : S.BadgeOffline;
  const PositionBadge = isClosed ? S.BadgeClosed : S.BadgeOpen;

  const StatusText: React.FC = () => {
    const Icon = status === "online" ? StatusOnlineIcon : StatusOfflineIcon;
    return (
      <>
        <Icon size={14} color={status === "online" ? COLORS.success : COLORS.error} />{" "}
        {status === "online" ? L.online : L.offline}
      </>
    );
  };

  return (
    <S.Card>
      <S.Header>
        <S.Name>{name}</S.Name>
        <S.Badges>
          <StatusBadge><StatusText /></StatusBadge>
          <PositionBadge>
            <CBIcon size={14} /> {isClosed ? L.closed : L.open}
          </PositionBadge>
        </S.Badges>
      </S.Header>

      {onDetailClick && (
        <S.DetailButton onClick={onDetailClick}>{L.detail}</S.DetailButton>
      )}
    </S.Card>
  );
};

CBCard.displayName = "CBCard";
