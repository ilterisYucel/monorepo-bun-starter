// packages/ui/src/components/RackCard/RackCard.tsx
import React from "react";
import type { RackCardProps } from "./RackCard.types";
import { formatTelemetryValue, formatValue } from "./RackCard.utils";
import * as S from "./RackCard.styles";

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

const getStatusText = (status: string): string => {
  return status === "online" ? "🟢 Çevrimiçi" : "🔴 Çevrimdışı";
};

const getChargeStatusText = (chargeStatus: string): string => {
  if (chargeStatus === "Charge") return "🔋 Şarj Oluyor";
  if (chargeStatus === "Discharge") return "⚡ Deşarj Oluyor";
  return "⏸️ Beklemede";
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
}) => {
  const percentage = Math.min(100, Math.max(0, soc || 0));
  const StatusBadge = getStatusBadge(status);
  const ChargeStatusBadge = getChargeStatusBadge(charge_status);

  return (
    <S.Card>
      <S.Header>
        <S.Name>{name}</S.Name>
        <S.Badges>
          <StatusBadge>{getStatusText(status)}</StatusBadge>
          <ChargeStatusBadge>
            {getChargeStatusText(charge_status)}
          </ChargeStatusBadge>
        </S.Badges>
      </S.Header>

      <S.SocContainer>
        <S.SocValue>{formatTelemetryValue(soc)}%</S.SocValue>
        <S.SocLabel>Şarj Durumu (SoC)</S.SocLabel>
        <S.SocBar>
          <S.SocBarFill style={{ width: `${percentage}%` }} />
        </S.SocBar>
      </S.SocContainer>

      <S.DetailsGrid>
        <S.DetailItem>
          <S.DetailIcon>🔋</S.DetailIcon>
          <S.DetailLabel>Voltaj</S.DetailLabel>
          <S.DetailValue>{formatValue(voltage, "V")}</S.DetailValue>
        </S.DetailItem>
        <S.DetailItem>
          <S.DetailIcon>⚡</S.DetailIcon>
          <S.DetailLabel>Akım</S.DetailLabel>
          <S.DetailValue>{formatValue(current, "A")}</S.DetailValue>
        </S.DetailItem>
        <S.DetailItem>
          <S.DetailIcon>💪</S.DetailIcon>
          <S.DetailLabel>Güç</S.DetailLabel>
          <S.DetailValue>{formatValue(power_kw, "kW")}</S.DetailValue>
        </S.DetailItem>
        <S.DetailItem>
          <S.DetailIcon>🌡️</S.DetailIcon>
          <S.DetailLabel>Sıcaklık</S.DetailLabel>
          <S.DetailValue>{formatValue(temperature, "°C")}</S.DetailValue>
        </S.DetailItem>
        <S.DetailItem>
          <S.DetailIcon>💚</S.DetailIcon>
          <S.DetailLabel>Sağlık (SoH)</S.DetailLabel>
          <S.DetailValue>
            {formatValue(soh !== undefined ? soh : null, "%")}
          </S.DetailValue>
        </S.DetailItem>
      </S.DetailsGrid>
    </S.Card>
  );
};
