import React from "react";
import { SCADA_ICONS } from "../../icons";
import type { HvacCardProps, HvacCardLabels } from "./HvacCard.types";
import * as S from "./HvacCard.styles";

const StatusOnlineIcon = SCADA_ICONS.statusOnline;
const StatusOfflineIcon = SCADA_ICONS.statusOffline;
const TempIcon = SCADA_ICONS.temperature;
const PowerIcon = SCADA_ICONS.powerPlug;
const HvacIcon = SCADA_ICONS.hvacUnit;
const WarningIcon = SCADA_ICONS.logWarning;

const DEFAULT_TR: HvacCardLabels = {
  running: "Çalışıyor",
  standby: "Beklemede",
  fault: "Arıza",
  cooling: "Soğutma",
  warming: "Isıtma",
  idle: "Beklemede",
  currentTemp: "Mevcut Sıcaklık",
  setTemp: "Hedef Sıcaklık",
  supplyTemp: "Üfleme Sıcaklığı",
  returnTemp: "Dönüş Sıcaklığı",
  returnHumidity: "Dönüş Nemi",
  supplyHumidity: "Üfleme Nemi",
  equipment: "Ekipman",
  normal: "Normal",
  alarms: "Alarm",
  detail: "Cihaz Detayları",
};

const fmt = (value: number | null | undefined, unit: string): string => {
  if (value == null) return "N/A";
  return `${value.toFixed(1)} ${unit}`;
};

const fmtTemp = (value: number | null | undefined): string => {
  if (value == null) return "N/A";
  return `${value.toFixed(1)}°C`;
};

const fmtHumi = (value: number | null | undefined): string => {
  if (value == null) return "N/A";
  return `%${value.toFixed(0)}`;
};

const DataRow: React.FC<{ icon: React.FC<{ size: number }>; label: string; value: string; warn?: boolean }> = ({
  icon: Icon,
  label,
  value,
  warn,
}) => (
  <S.DataItem>
    <S.DataIcon><Icon size={15} /></S.DataIcon>
    <S.DataLabel>{label}</S.DataLabel>
    <S.DataValue>
      {warn ? <S.AlarmText $hasAlarm={value !== "0"}>{value}</S.AlarmText> : value}
    </S.DataValue>
  </S.DataItem>
);

export const HvacCard: React.FC<HvacCardProps> = ({
  name,
  room,
  status,
  currentTemp,
  mode,
  setTemp,
  supplyTemp,
  returnTemp,
  returnHumidity,
  supplyHumidity,
  equipmentStatus,
  alarmCount = 0,
  onDetailClick,
  labels: rawLabels,
}) => {
  const L = rawLabels ?? DEFAULT_TR;

  const StatusBadge = status === "running" ? S.BadgeRunning
    : status === "fault" ? S.BadgeFault
    : S.BadgeStandby;

  const ModeBadge = mode === "cooling" ? S.BadgeCooling
    : mode === "warming" ? S.BadgeWarming
    : S.BadgeIdle;

  const statusLabel = status === "running" ? L.running
    : status === "fault" ? L.fault
    : L.standby;

  const modeLabel = mode === "cooling" ? L.cooling
    : mode === "warming" ? L.warming
    : L.idle;

  const StatusIcon = status === "fault" ? StatusOfflineIcon : StatusOnlineIcon;
  const statusColor = status === "fault" ? "#ef4444" : status === "running" ? "#10b981" : "#6b7280";

  return (
    <S.Card>
      <S.Header>
        <S.Name>{name}</S.Name>
        <S.Badges>
          <StatusBadge>
            <StatusIcon size={14} color={statusColor} />{" "}
            {statusLabel}
          </StatusBadge>
          <ModeBadge>
            <HvacIcon size={14} /> {modeLabel}
          </ModeBadge>
        </S.Badges>
      </S.Header>

      <S.TempDisplay>
        <S.TempValue>{currentTemp != null ? `${currentTemp.toFixed(1)}°C` : "N/A"}</S.TempValue>
        <S.TempLabel>{L.currentTemp}</S.TempLabel>
      </S.TempDisplay>

      <S.DataGrid>
        <DataRow icon={TempIcon} label={L.setTemp} value={fmtTemp(setTemp)} />
        <DataRow icon={TempIcon} label={L.supplyTemp} value={fmtTemp(supplyTemp)} />
        <DataRow icon={TempIcon} label={L.returnTemp} value={fmtTemp(returnTemp)} />
        <DataRow icon={PowerIcon} label={L.returnHumidity} value={fmtHumi(returnHumidity)} />
        <DataRow icon={PowerIcon} label={L.supplyHumidity} value={fmtHumi(supplyHumidity)} />
        <DataRow icon={HvacIcon} label={L.equipment} value={equipmentStatus ?? L.normal} />
        <DataRow icon={WarningIcon} label={L.alarms} value={String(alarmCount)} warn />
      </S.DataGrid>

      {onDetailClick && (
        <S.DetailButton onClick={onDetailClick}>{L.detail}</S.DetailButton>
      )}
    </S.Card>
  );
};

HvacCard.displayName = "HvacCard";
