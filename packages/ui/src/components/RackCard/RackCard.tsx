// packages/ui/src/components/RackCard/RackCard.tsx
import React from "react";
import { SCADA_ICONS } from "../../icons";
import type { RackCardProps } from "./RackCard.types";
import { formatTelemetryValue, formatValue } from "./RackCard.utils";
import * as S from "./RackCard.styles";

const StatusOnlineIcon = SCADA_ICONS.statusOnline;
const StatusOfflineIcon = SCADA_ICONS.statusOffline;
const BatteryChargeIcon = SCADA_ICONS.batteryCharge;
const BatteryDischargeIcon = SCADA_ICONS.batteryDischarge;
const StatusIdleIcon = SCADA_ICONS.statusIdle;
const BatteryIcon = SCADA_ICONS.battery;
const TempIcon = SCADA_ICONS.temperature;
const PowerIcon = SCADA_ICONS.powerPlug;
const HealthIcon = SCADA_ICONS.health;

const getStatusBadge = (status: string) => {
  return status === "online" ? S.BadgeOnline : S.BadgeOffline;
};

const getChargeStatusBadge = (chargeStatus: string) => {
  switch (chargeStatus) {
    case "Charge":
      return S.BadgeCharge;
    case "Discharge":
      return S.BadgeDischarge;
    default:
      return S.BadgeIdle;
  }
};

const StatusText: React.FC<{ status: string }> = ({ status }) => {
  const Icon = status === "online" ? StatusOnlineIcon : StatusOfflineIcon;
  return <><Icon size={14} color={status === "online" ? "#10b981" : "#ef4444"} /> {status === "online" ? "Çevrimiçi" : "Çevrimdışı"}</>;
};

const ChargeStatusText: React.FC<{ chargeStatus: string }> = ({ chargeStatus }) => {
  if (chargeStatus === "Charge") return <><BatteryChargeIcon size={14} /> Şarj Oluyor</>;
  if (chargeStatus === "Discharge") return <><BatteryDischargeIcon size={14} /> Deşarj Oluyor</>;
  return <><StatusIdleIcon size={14} /> Beklemede</>;
};

export const RackCard: React.FC<RackCardProps> = ({
  name,
  status,
  charge_status,
  soc,
  soh,
  voltage,
  current,
  power_kw,
  temperature,
  onDetailClick,
}) => {
  const percentage = Math.min(100, Math.max(0, soc || 0));
  const StatusBadge = getStatusBadge(status);
  const ChargeStatusBadge = getChargeStatusBadge(charge_status);

  return (
    <S.Card>
      <S.Header>
        <S.Name>{name}</S.Name>
        <S.Badges>
          <StatusBadge><StatusText status={status} /></StatusBadge>
          <ChargeStatusBadge>
            <ChargeStatusText chargeStatus={charge_status} />
          </ChargeStatusBadge>
        </S.Badges>
      </S.Header>

      <S.SocContainer>
        <S.SocValue>{formatTelemetryValue(soc)}%</S.SocValue>
        <S.SocLabel>SoC</S.SocLabel>
        <S.SocBar>
          <S.SocBarFill style={{ width: `${percentage}%` }} />
        </S.SocBar>
      </S.SocContainer>

      <S.DetailsGrid>
        <S.DetailItem>
          <S.DetailIcon><BatteryIcon size={16} /></S.DetailIcon>
          <S.DetailLabel>Voltaj</S.DetailLabel>
          <S.DetailValue>{formatValue(voltage, "V")}</S.DetailValue>
        </S.DetailItem>
        <S.DetailItem>
          <S.DetailIcon><BatteryDischargeIcon size={16} /></S.DetailIcon>
          <S.DetailLabel>Akım</S.DetailLabel>
          <S.DetailValue>{formatValue(current, "A")}</S.DetailValue>
        </S.DetailItem>
        <S.DetailItem>
          <S.DetailIcon><PowerIcon size={16} /></S.DetailIcon>
          <S.DetailLabel>Güç</S.DetailLabel>
          <S.DetailValue>{formatValue(power_kw, "kW")}</S.DetailValue>
        </S.DetailItem>
        <S.DetailItem>
          <S.DetailIcon><TempIcon size={16} /></S.DetailIcon>
          <S.DetailLabel>Sıcaklık</S.DetailLabel>
          <S.DetailValue>{formatValue(temperature, "°C")}</S.DetailValue>
        </S.DetailItem>
        <S.DetailItem>
          <S.DetailIcon><HealthIcon size={16} /></S.DetailIcon>
          <S.DetailLabel>SoH</S.DetailLabel>
          <S.DetailValue>
            {formatValue(soh !== undefined ? soh : null, "%")}
          </S.DetailValue>
        </S.DetailItem>
      </S.DetailsGrid>

      {onDetailClick && (
        <S.DetailButton onClick={onDetailClick}>Detay Göster</S.DetailButton>
      )}
    </S.Card>
  );
};