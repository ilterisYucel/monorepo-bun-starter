import React from "react";
import { SCADA_ICONS } from "../../icons";
import { COLORS } from "../../colors";
import type { CBCardProps, CBCardLabels } from "./CBCard.types";
import * as S from "./CBCard.styles";

const StatusOnlineIcon = SCADA_ICONS.statusOnline;
const StatusOfflineIcon = SCADA_ICONS.statusOffline;
const BatteryIcon = SCADA_ICONS.battery;
const PowerIcon = SCADA_ICONS.powerPlug;
const CBIcon = SCADA_ICONS.circuitBreaker;

const DEFAULT_TR: CBCardLabels = {
  online: "Çevrimiçi",
  offline: "Çevrimdışı",
  closed: "Kapalı",
  open: "Açık",
  tripped: "Atmış",
  normal: "Normal",
  voltage: "Voltaj",
  current: "Akım",
  tripCount: "Açma Sayısı",
  closeCount: "Kapama Sayısı",
  detail: "Cihaz Detayları",
};

const fmt = (value: number | null | undefined, unit: string): string => {
  if (value == null) return "N/A";
  return `${value.toFixed(1)} ${unit}`;
};

const DataRow: React.FC<{ icon: React.FC<{ size: number }>; label: string; value: string }> = ({
  icon: Icon,
  label,
  value,
}) => (
  <S.DataItem>
    <S.DataIcon><Icon size={15} /></S.DataIcon>
    <S.DataLabel>{label}</S.DataLabel>
    <S.DataValue>{value}</S.DataValue>
  </S.DataItem>
);

export const CBCard: React.FC<CBCardProps> = ({
  name,
  status,
  isClosed,
  isTripped,
  voltage,
  current,
  tripCount,
  closeCount,
  onDetailClick,
  labels: rawLabels,
}) => {
  const L = rawLabels ?? DEFAULT_TR;
  const StatusBadge = status === "online" ? S.BadgeOnline : S.BadgeOffline;
  const PositionBadge = isClosed ? S.BadgeClosed : S.BadgeOpen;
  const TripBadge = isTripped ? S.BadgeTripped : S.BadgeNormal;

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
          <TripBadge>
            {isTripped ? L.tripped : L.normal}
          </TripBadge>
        </S.Badges>
      </S.Header>

      <S.DataGrid>
        <DataRow icon={BatteryIcon} label={L.voltage} value={fmt(voltage, "V")} />
        <DataRow icon={PowerIcon} label={L.current} value={fmt(current, "A")} />
        <DataRow icon={CBIcon} label={L.tripCount} value={String(tripCount)} />
        <DataRow icon={CBIcon} label={L.closeCount} value={String(closeCount)} />
      </S.DataGrid>

      {onDetailClick && (
        <S.DetailButton onClick={onDetailClick}>{L.detail}</S.DetailButton>
      )}
    </S.Card>
  );
};

CBCard.displayName = "CBCard";
