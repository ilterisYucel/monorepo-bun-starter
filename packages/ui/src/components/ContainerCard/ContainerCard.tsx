import React from "react";
import { ContainerConnectionBadge } from "../ContainerConnectionBadge/ContainerConnectionBadge";
import type { ContainerCardProps } from "./ContainerCard.types";
import * as S from "./ContainerCard.styles";

const STATUS_LABEL: Record<string, string> = {
  online: "Aktif",
  warning: "Uyarı",
  offline: "Çevrimdışı",
};

const formatKw = (kw?: number) => {
  if (kw === undefined || kw === null) return "—";
  return `${kw.toFixed(1)} kW`;
};

const formatTemp = (c?: number) => {
  if (c === undefined || c === null) return "—";
  return `${c.toFixed(0)}°C`;
};

export const ContainerCard: React.FC<ContainerCardProps> = ({
  containerId,
  name,
  status,
  connected,
  soc,
  powerKw,
  temperature,
  deviceCount,
  activeDeviceCount,
  onClick,
}) => {
  const socPercent = Math.min(100, Math.max(0, soc ?? 0));

  return (
    <S.Card onClick={onClick} type="button">
      <S.Header>
        <S.NameRow>
          <S.StatusDot $status={status} />
          <S.Name>{name}</S.Name>
        </S.NameRow>
        <ContainerConnectionBadge
          connected={connected}
          label="PPC: Bağlı"
          size="small"
        />
      </S.Header>

      <S.SocSection>
        <S.SocHeader>
          <S.SocValue>%{Math.round(socPercent)}</S.SocValue>
          <S.SocLabel>SoC</S.SocLabel>
        </S.SocHeader>
        <S.SocBar>
          <S.SocBarFill $percent={socPercent} />
        </S.SocBar>
      </S.SocSection>

      <S.MetricsRow>
        <S.Metric>
          <S.MetricValue>{formatKw(powerKw)}</S.MetricValue>
          <S.MetricLabel>Güç</S.MetricLabel>
        </S.Metric>
        <S.Metric>
          <S.MetricValue>{formatTemp(temperature)}</S.MetricValue>
          <S.MetricLabel>Sıcaklık</S.MetricLabel>
        </S.Metric>
        <S.Metric>
          <S.MetricValue>
            {activeDeviceCount}/{deviceCount}
          </S.MetricValue>
          <S.MetricLabel>Cihaz</S.MetricLabel>
        </S.Metric>
      </S.MetricsRow>

      <S.Bottom>
        <S.DeviceCount $ok={activeDeviceCount === deviceCount}>
          {STATUS_LABEL[status] ?? status}
        </S.DeviceCount>
      </S.Bottom>
    </S.Card>
  );
};
