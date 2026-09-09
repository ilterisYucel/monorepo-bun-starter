import React from "react";
import { SCADA_ICONS } from "../../icons";
import { useTranslation } from "../../core/TranslationProvider";
import type { FieldCardProps } from "./FieldCard.types";
import * as S from "./FieldCard.styles";

const ContainerIcon = SCADA_ICONS.container;
const PowerIcon = SCADA_ICONS.powerPlug;
const WarningIcon = SCADA_ICONS.logWarning;

const STATUS_KEY: Record<string, string> = {
  online: "common.online",
  warning: "status.warning",
  offline: "common.offline",
};

const formatMw = (mw?: number) => {
  if (mw === undefined || mw === null) return "—";
  return `${mw.toFixed(1)} MW`;
};

/**
 * FieldCard — saha özet kartı (boss Sahalar sayfası, konsol paneli).
 * Durum renkli accent şerit, conic-gradient SoC halkası, online'da pulse
 * noktası; metrik satırları halkanın yanında dikey dizilir.
 */
export const FieldCard: React.FC<FieldCardProps> = ({ field, onClick, size = "medium" }) => {
  const { t } = useTranslation();
  const hasSoc = field.avgSoc !== undefined && field.avgSoc !== null;
  const soc = Math.min(100, Math.max(0, field.avgSoc ?? 0));

  return (
    <S.Card $size={size} $status={field.status} onClick={onClick} type="button">
      <S.AccentStrip $status={field.status} />

      <S.Header>
        <S.NameRow>
          <S.StatusDot $status={field.status} />
          <S.Name>{field.name}</S.Name>
        </S.NameRow>
        <S.StatusPill $status={field.status}>
          {t(STATUS_KEY[field.status] ?? field.status)}
        </S.StatusPill>
      </S.Header>

      <S.Body>
        <S.SocBlock>
          <S.SocRing $percent={soc}>
            <S.SocRingCenter>{hasSoc ? `%${Math.round(soc)}` : "—"}</S.SocRingCenter>
          </S.SocRing>
          <S.SocCaption>{t("field.soc")}</S.SocCaption>
        </S.SocBlock>

        <S.Metrics>
          <S.MetricRow>
            <S.MetricIcon><ContainerIcon size={14} /></S.MetricIcon>
            <S.MetricLabel>{t("field.containers")}</S.MetricLabel>
            <S.MetricValue $ok={field.onlineContainerCount === field.containerCount}>
              {field.onlineContainerCount}/{field.containerCount}
            </S.MetricValue>
          </S.MetricRow>
          <S.MetricRow>
            <S.MetricIcon><PowerIcon size={14} /></S.MetricIcon>
            <S.MetricLabel>{t("field.power")}</S.MetricLabel>
            <S.MetricValue>{formatMw(field.totalPowerMw)}</S.MetricValue>
          </S.MetricRow>
          <S.MetricRow>
            <S.MetricIcon><WarningIcon size={14} /></S.MetricIcon>
            <S.MetricLabel>{t("field.alarm")}</S.MetricLabel>
            <S.MetricValue $alarm={(field.activeAlarms ?? 0) > 0}>
              {field.activeAlarms ?? 0}
            </S.MetricValue>
          </S.MetricRow>
        </S.Metrics>
      </S.Body>
    </S.Card>
  );
};
