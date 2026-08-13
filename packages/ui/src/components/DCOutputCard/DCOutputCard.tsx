import React from "react";
import { SCADA_ICONS } from "../../icons";
import { COLORS } from "../../colors";
import type { DCOutputCardProps, DCOutputCardLabels } from "./DCOutputCard.types";
import * as S from "./DCOutputCard.styles";

const StatusOnlineIcon = SCADA_ICONS.statusOnline;
const StatusOfflineIcon = SCADA_ICONS.statusOffline;
const BatteryIcon = SCADA_ICONS.battery;
const DCOutputIcon = SCADA_ICONS.dcOutput;

const DEFAULT_TR: DCOutputCardLabels = {
  online: "Çevrimiçi",
  offline: "Çevrimdışı",
  on: "Açık",
  off: "Kapalı",
  actualVoltage: "Gerçek Voltaj",
  actualCurrent: "Gerçek Akım",
  setVoltage: "Ayar Voltajı",
  setCurrent: "Ayar Akımı",
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

export const DCOutputCard: React.FC<DCOutputCardProps> = ({
  name,
  status,
  isOn,
  actualVoltage,
  actualCurrent,
  setVoltage,
  setCurrent,
  onDetailClick,
  labels: rawLabels,
}) => {
  const L = rawLabels ?? DEFAULT_TR;
  const StatusBadge = status === "online" ? S.BadgeOnline : S.BadgeOffline;
  const OnOffBadge = isOn ? S.BadgeOn : S.BadgeOff;

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
          <OnOffBadge>
            <DCOutputIcon size={14} /> {isOn ? L.on : L.off}
          </OnOffBadge>
        </S.Badges>
      </S.Header>

      <S.DataGrid>
        <DataRow icon={BatteryIcon} label={L.actualVoltage} value={fmt(actualVoltage, "V")} />
        <DataRow icon={DCOutputIcon} label={L.actualCurrent} value={fmt(actualCurrent, "A")} />
        <DataRow icon={BatteryIcon} label={L.setVoltage} value={fmt(setVoltage, "V")} />
        <DataRow icon={DCOutputIcon} label={L.setCurrent} value={fmt(setCurrent, "A")} />
      </S.DataGrid>

      {onDetailClick && (
        <S.DetailButton onClick={onDetailClick}>{L.detail}</S.DetailButton>
      )}
    </S.Card>
  );
};

DCOutputCard.displayName = "DCOutputCard";
