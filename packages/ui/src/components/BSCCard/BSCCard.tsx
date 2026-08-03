import React from "react";
import { SCADA_ICONS } from "../../icons";
import { COLORS } from "../../colors";
import type { BSCCardProps } from "./BSCCard.types";
import * as S from "./BSCCard.styles";

const StatusOnlineIcon = SCADA_ICONS.statusOnline;
const StatusOfflineIcon = SCADA_ICONS.statusOffline;
const BatteryChargeIcon = SCADA_ICONS.batteryCharge;
const BatteryDischargeIcon = SCADA_ICONS.batteryDischarge;
const StatusIdleIcon = SCADA_ICONS.statusIdle;
const BatteryIcon = SCADA_ICONS.battery;
const TempIcon = SCADA_ICONS.temperature;
const PowerIcon = SCADA_ICONS.powerPlug;
const HealthIcon = SCADA_ICONS.health;
const InfoIcon = SCADA_ICONS.logInfo;
const ContainerIcon = SCADA_ICONS.container;

const fmt = (value: number | null | undefined, unit: string): string => {
  if (value == null) return "N/A";
  return `${value.toFixed(1)} ${unit}`;
};

const fmtPct = (value: number | null | undefined): string => {
  if (value == null) return "N/A";
  return `${value.toFixed(1)}%`;
};

const fmtStr = (value: string): string => value || "N/A";

const getStatusBadge = (status: string) =>
  status === "online" ? S.BadgeOnline : S.BadgeOffline;

const getChargeStatusBadge = (chargeStatus: string) => {
  switch (chargeStatus) {
    case "Charge": return S.BadgeCharge;
    case "Discharge": return S.BadgeDischarge;
    default: return S.BadgeIdle;
  }
};

const StatusText: React.FC<{ status: string }> = ({ status }) => {
  const Icon = status === "online" ? StatusOnlineIcon : StatusOfflineIcon;
  return (
    <>
      <Icon size={14} color={status === "online" ? COLORS.success : COLORS.error} />{" "}
      {status === "online" ? "Çevrimiçi" : "Çevrimdışı"}
    </>
  );
};

const ChargeStatusText: React.FC<{ chargeStatus: string }> = ({ chargeStatus }) => {
  if (chargeStatus === "Charge") return <><BatteryChargeIcon size={14} /> Şarj Oluyor</>;
  if (chargeStatus === "Discharge") return <><BatteryDischargeIcon size={14} /> Deşarj Oluyor</>;
  return <><StatusIdleIcon size={14} /> Beklemede</>;
};

const MetricDisplay: React.FC<{ value: number | null; label: string }> = ({ value, label }) => {
  const pct = Math.min(100, Math.max(0, value || 0));
  return (
    <S.MetricBlock>
      <S.MetricValue>{fmtPct(value)}</S.MetricValue>
      <S.MetricLabel>{label}</S.MetricLabel>
      <S.MetricBar>
        <S.MetricBarFill style={{ width: `${pct}%` }} />
      </S.MetricBar>
    </S.MetricBlock>
  );
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

export const BSCCard: React.FC<BSCCardProps> = ({
  name,
  status,
  chargeStatus,
  soc,
  soh,
  rackCount,
  onlineRackCount,
  systemPowerKw,
  voltage,
  current,
  chargePowerKw,
  dischargePowerKw,
  anticipatedVoltage,
  temperature,
  version,
  state,
  heartbeat,
  requestAck,
  lastAcceptedReq,
  onDetailClick,
}) => {
  const StatusBadge = getStatusBadge(status);
  const ChargeStatusBadge = getChargeStatusBadge(chargeStatus);

  return (
    <S.Card>
      <S.Header>
        <S.Name>{name}</S.Name>
        <S.Badges>
          <StatusBadge><StatusText status={status} /></StatusBadge>
          <ChargeStatusBadge><ChargeStatusText chargeStatus={chargeStatus} /></ChargeStatusBadge>
        </S.Badges>
      </S.Header>

      <S.MetricsRow>
        <MetricDisplay value={soc} label="Sistem SoC" />
        <S.MetricDivider />
        <MetricDisplay value={soh} label="Sistem SoH" />
      </S.MetricsRow>

      <S.InfoRow>
        <S.InfoText>
          <ContainerIcon size={14} /> Raf:{" "}
          <S.InfoValue>{onlineRackCount}/{rackCount} Aktif</S.InfoValue>
        </S.InfoText>
        <S.InfoText>
          <PowerIcon size={14} /> Sistem Gücü:{" "}
          <S.InfoValue>{fmt(systemPowerKw, "kW")}</S.InfoValue>
        </S.InfoText>
      </S.InfoRow>

      <S.DataGrid>
        <DataRow icon={BatteryIcon} label="Voltaj" value={fmt(voltage, "V")} />
        <DataRow icon={BatteryDischargeIcon} label="Akım" value={fmt(current, "A")} />
        <DataRow icon={PowerIcon} label="Şarj Gücü" value={fmt(chargePowerKw, "kW")} />
        <DataRow icon={PowerIcon} label="Deşarj Gücü" value={fmt(dischargePowerKw, "kW")} />
        <DataRow icon={BatteryIcon} label="Beklenen Voltaj" value={fmt(anticipatedVoltage, "V")} />
        <DataRow icon={TempIcon} label="Sıcaklık (Maks)" value={fmt(temperature, "°C")} />
        <DataRow icon={InfoIcon} label="Versiyon" value={fmtStr(version)} />
        <DataRow icon={InfoIcon} label="Durum" value={fmtStr(state)} />
        <DataRow icon={InfoIcon} label="Heartbeat" value={fmtStr(heartbeat)} />
        <DataRow icon={InfoIcon} label="Komut Yanıtı" value={fmtStr(requestAck)} />
        <DataRow icon={InfoIcon} label="Son Komut" value={fmtStr(lastAcceptedReq)} />
      </S.DataGrid>

      {onDetailClick && (
        <S.DetailButton onClick={onDetailClick}>Detay Göster</S.DetailButton>
      )}
    </S.Card>
  );
};
