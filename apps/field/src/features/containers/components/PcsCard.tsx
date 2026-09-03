import React from "react";
import { COLORS, SCADA_ICONS, useTranslation } from "@gd-monorepo/ui";
import type { TelemetryData } from "@gd-monorepo/shared-types";
import {
  pcsState,
  pcsTelemetryValue,
} from "../hooks/pcsDerivation";
import * as S from "./PcsCard.styles";

/** PCS özeti — yapısal sözleşme (snapshot telemetrisinden türetilir). */
export interface PcsSummary {
  pcsId: string;
  containerId: string;
  containerName: string;
  connected: boolean;
  latestTelemetry: TelemetryData[];
}

const PcsIcon = SCADA_ICONS.powerPlug;
const BatteryChargeIcon = SCADA_ICONS.batteryCharge;
const BatteryDischargeIcon = SCADA_ICONS.batteryDischarge;
const StatusIdleIcon = SCADA_ICONS.statusIdle;
const DetailIcon = SCADA_ICONS.details;
const SettingsIcon = SCADA_ICONS.settings;

const KIND_COLOR: Record<string, string> = {
  offline: COLORS.error,
  charging: COLORS.success,
  discharging: COLORS.warning,
  idle: COLORS.textMuted,
};

const KIND_ALPHA: Record<string, string> = {
  offline: COLORS.errorAlpha12,
  charging: COLORS.successAlpha12,
  discharging: COLORS.warningAlpha12,
  idle: COLORS.idleAlpha12,
};

const KIND_ICON: Record<string, typeof BatteryChargeIcon> = {
  offline: StatusIdleIcon,
  charging: BatteryChargeIcon,
  discharging: BatteryDischargeIcon,
  idle: StatusIdleIcon,
};

/**
 * PcsCard — konteyner başına TEK PCS kartı (2026-08-30, RackCard formatı):
 *
 * Başlık (pcsId + konteyner) ve iki rozet (bağlantı + şarj/deşarj durumu),
 * büyük işaretli AC aktif güç metriği, düz 2 sütunlu detay grid'i (DC/AC/
 * kullanılabilir/enerji — 2026-09-02 genişletmesi, bölüm başlıksız) ve
 * opsiyonel Detay/Config aksiyonları. Ayrıntılı AC/DC/enerji bölümleri
 * PcsDetailModal'da, kayıt/bağlantı meta bilgileri PcsConfigModal'da yaşar.
 */
export const PcsCard: React.FC<{
  pcs: PcsSummary;
  onDetailClick?: () => void;
  onConfigClick?: () => void;
}> = ({ pcs, onDetailClick, onConfigClick }) => {
  const { t } = useTranslation();
  const activePower = pcsTelemetryValue(pcs.latestTelemetry, "AC Active Power");
  const state = pcsState(pcs.connected, activePower);
  const stateColor = KIND_COLOR[state.kind];
  const StatusIcon = KIND_ICON[state.kind];
  const powerColor =
    state.kind === "charging"
      ? COLORS.success
      : state.kind === "discharging"
        ? COLORS.warning
        : COLORS.textMuted;

  return (
    <S.Card>
      <S.Header>
        <PcsIcon size={16} color={stateColor} />
        <S.Name>{pcs.pcsId}</S.Name>
        <S.ContainerName>{pcs.containerName}</S.ContainerName>
        <S.Badges>
          <S.Badge
            color={pcs.connected ? COLORS.success : COLORS.error}
            alpha={pcs.connected ? COLORS.successAlpha12 : COLORS.errorAlpha12}
          >
            {pcs.connected ? t("common.online") : t("common.offline")}
          </S.Badge>
          <S.Badge color={stateColor} alpha={KIND_ALPHA[state.kind]}>
            <StatusIcon size={12} />
            {t(state.statusKey)}
          </S.Badge>
        </S.Badges>
      </S.Header>

      <S.MainMetric>
        <S.MainValue color={powerColor}>
          {activePower < 0 ? "−" : ""}
          {Math.abs(activePower).toFixed(1)} kW
        </S.MainValue>
        <S.MainLabel>{t("pcs.activePower")}</S.MainLabel>
      </S.MainMetric>

      <S.DetailsGrid>
        <S.DetailItem>
          <S.DetailLabel>{t("pcs.dcVoltage")}</S.DetailLabel>
          <S.DetailValue>
            {pcsTelemetryValue(pcs.latestTelemetry, "DC Voltage").toFixed(0)} V
          </S.DetailValue>
        </S.DetailItem>
        <S.DetailItem>
          <S.DetailLabel>{t("pcs.dcCurrent")}</S.DetailLabel>
          <S.DetailValue>
            {pcsTelemetryValue(pcs.latestTelemetry, "DC Current").toFixed(1)} A
          </S.DetailValue>
        </S.DetailItem>
        <S.DetailItem>
          <S.DetailLabel>{t("pcs.dcPower")}</S.DetailLabel>
          <S.DetailValue>
            {pcsTelemetryValue(pcs.latestTelemetry, "DC Power").toFixed(1)} kW
          </S.DetailValue>
        </S.DetailItem>
        <S.DetailItem>
          <S.DetailLabel>{t("pcs.igbtTemp")}</S.DetailLabel>
          <S.DetailValue>
            {pcsTelemetryValue(pcs.latestTelemetry, "IGBT Temperature").toFixed(1)} °C
          </S.DetailValue>
        </S.DetailItem>
        <S.DetailItem>
          <S.DetailLabel>{t("pcs.cabinTemp")}</S.DetailLabel>
          <S.DetailValue>
            {pcsTelemetryValue(pcs.latestTelemetry, "Cabin Temperature").toFixed(1)} °C
          </S.DetailValue>
        </S.DetailItem>
        <S.DetailItem>
          <S.DetailLabel>{t("pcs.voltageAB")}</S.DetailLabel>
          <S.DetailValue>
            {pcsTelemetryValue(pcs.latestTelemetry, "AC Voltage AB").toFixed(0)} V
          </S.DetailValue>
        </S.DetailItem>
        <S.DetailItem>
          <S.DetailLabel>{t("pcs.frequency")}</S.DetailLabel>
          <S.DetailValue>
            {pcsTelemetryValue(pcs.latestTelemetry, "AC Frequency").toFixed(1)} Hz
          </S.DetailValue>
        </S.DetailItem>
        <S.DetailItem>
          <S.DetailLabel>{t("pcs.powerFactor")}</S.DetailLabel>
          <S.DetailValue>
            {pcsTelemetryValue(pcs.latestTelemetry, "Power Factor").toFixed(2)}
          </S.DetailValue>
        </S.DetailItem>
        <S.DetailItem>
          <S.DetailLabel>{t("pcs.currentA")}</S.DetailLabel>
          <S.DetailValue>
            {pcsTelemetryValue(pcs.latestTelemetry, "Phase Current A").toFixed(1)} A
          </S.DetailValue>
        </S.DetailItem>
        <S.DetailItem>
          <S.DetailLabel>{t("pcs.availableCharge")}</S.DetailLabel>
          <S.DetailValue>
            {pcsTelemetryValue(pcs.latestTelemetry, "Available Charge Power").toFixed(0)} kW
          </S.DetailValue>
        </S.DetailItem>
        <S.DetailItem>
          <S.DetailLabel>{t("pcs.availableDischarge")}</S.DetailLabel>
          <S.DetailValue>
            {pcsTelemetryValue(pcs.latestTelemetry, "Available Discharge Power").toFixed(0)} kW
          </S.DetailValue>
        </S.DetailItem>
        <S.DetailItem>
          <S.DetailLabel>{t("pcs.totalChargeEnergy")}</S.DetailLabel>
          <S.DetailValue>
            {pcsTelemetryValue(pcs.latestTelemetry, "Total Charge Energy").toFixed(0)} kWh
          </S.DetailValue>
        </S.DetailItem>
        <S.DetailItem>
          <S.DetailLabel>{t("pcs.totalDischargeEnergy")}</S.DetailLabel>
          <S.DetailValue>
            {pcsTelemetryValue(pcs.latestTelemetry, "Total Discharge Energy").toFixed(0)} kWh
          </S.DetailValue>
        </S.DetailItem>
      </S.DetailsGrid>

      {(onDetailClick || onConfigClick) && (
        <S.ButtonRow>
          {onDetailClick && (
            <S.ActionButton onClick={onDetailClick}>
              <DetailIcon size={14} />
              {t("pcs.detail")}
            </S.ActionButton>
          )}
          {onConfigClick && (
            <S.ActionButton onClick={onConfigClick}>
              <SettingsIcon size={14} />
              {t("pcs.config")}
            </S.ActionButton>
          )}
        </S.ButtonRow>
      )}
    </S.Card>
  );
};
