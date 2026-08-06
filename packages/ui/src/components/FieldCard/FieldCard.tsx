import React from "react";
import { SCADA_ICONS } from "../../icons";
import type { FieldCardProps } from "./FieldCard.types";
import * as S from "./FieldCard.styles";

const ContainerIcon = SCADA_ICONS.container;
const PowerIcon = SCADA_ICONS.powerPlug;
const BatteryIcon = SCADA_ICONS.battery;
const WarningIcon = SCADA_ICONS.logWarning;

const STATUS_LABEL: Record<string, string> = {
  online: "Aktif",
  warning: "Uyarı",
  offline: "Çevrimdışı",
};

const formatMw = (mw?: number) => {
  if (mw === undefined || mw === null) return "—";
  return `${mw.toFixed(1)} MW`;
};

const formatSoc = (soc?: number) => {
  if (soc === undefined || soc === null) return "—";
  return `%${Math.round(soc)}`;
};

export const FieldCard: React.FC<FieldCardProps> = ({ field, onClick, size = "medium" }) => (
  <S.Card $size={size} onClick={onClick} type="button">
    <S.Header>
      <S.NameRow>
        <S.StatusDot $status={field.status} />
        <S.Name>{field.name}</S.Name>
      </S.NameRow>
      <S.StatusText $status={field.status}>
        {STATUS_LABEL[field.status] ?? field.status}
      </S.StatusText>
    </S.Header>

    <S.Metrics>
      <S.MetricRow>
        <S.MetricIcon><ContainerIcon size={14} /></S.MetricIcon>
        <S.MetricLabel>Konteyner</S.MetricLabel>
        <S.ContainerCount $ok={field.onlineContainerCount === field.containerCount}>
          {field.onlineContainerCount}/{field.containerCount}
        </S.ContainerCount>
      </S.MetricRow>

      <S.MetricRow>
        <S.MetricIcon><PowerIcon size={14} /></S.MetricIcon>
        <S.MetricLabel>Güç</S.MetricLabel>
        <S.MetricValue>{formatMw(field.totalPowerMw)}</S.MetricValue>
      </S.MetricRow>

      <S.MetricRow>
        <S.MetricIcon><BatteryIcon size={14} /></S.MetricIcon>
        <S.MetricLabel>SoC</S.MetricLabel>
        <S.MetricValue>{formatSoc(field.avgSoc)}</S.MetricValue>
      </S.MetricRow>

      <S.MetricRow>
        <S.MetricIcon><WarningIcon size={14} /></S.MetricIcon>
        <S.MetricLabel>Alarm</S.MetricLabel>
        <S.AlarmCount $hasAlarms={(field.activeAlarms ?? 0) > 0}>
          {field.activeAlarms ?? 0}
        </S.AlarmCount>
      </S.MetricRow>
    </S.Metrics>
  </S.Card>
);
