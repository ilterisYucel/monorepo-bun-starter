import React, { useMemo, useState } from "react";
import { FirePanelCard, SingleTelemetryChart, SCADA_ICONS, useTranslation } from "@gd-monorepo/ui";
import type { FirePanelCardLabels, TelemetryChartLabels } from "@gd-monorepo/ui";
import { useFireAlarmData } from "../features/fire/hooks/useFireAlarmData";
import { useTelemetryProvider } from "../hooks/useTelemetryProvider";
import { useTelemetryNames } from "../hooks/useTelemetryNames";
import { DeviceDetailModal } from "../features/devices/components/DeviceDetailModal";
import * as S from "./FirePanelPage.styles";

export const FirePanelPage: React.FC = () => {
  const { state, isLoading } = useFireAlarmData();
  const { t, locale } = useTranslation();
  const loc = locale();
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);

  const { names: fireNames } = useTelemetryNames(["EP203"]);
  const fireProvider = useTelemetryProvider({ telemetryNames: fireNames, defaultRange: "1h", defaultPoints: 200, deviceIds: ["EP203"] });

  const chartLabels: TelemetryChartLabels = useMemo(() => ({
    range1m: t("chart.range.1m"), range1h: t("chart.range.1h"), range1d: t("chart.range.1d"),
    range1w: t("chart.range.1w"), range1M: t("chart.range.1M"), range3M: t("chart.range.3M"),
    range6M: t("chart.range.6M"), range1y: t("chart.range.1y"),
    rangeCustom: t("chart.range.custom"), rangeFrom: t("chart.range.from"), rangeTo: t("chart.range.to"),
    pointsLow: t("chart.control.points.low"), pointsStandard: t("chart.control.points.standard"),
    pointsHigh: t("chart.control.points.high"), pointsMax: t("chart.control.points.max"),
    timeRange: t("chart.control.timeRange"), points: t("chart.control.points"), metric: t("chart.control.metric"),
    all: t("common.all"), none: t("common.none"), selected: t("common.selected"),
    systemEvents: t("chart.control.systemEvents"), userActions: t("chart.control.userActions"),
    correctedEvents: t("chart.control.correctedEvents"),
    loadFailed: t("error.loadFailed"), loading: t("common.loading"), waitingData: t("common.waitingData"), noData: t("common.noData"), stats: t("chart.control.stats"),
    pointsUnit: t("chart.subtitle.points"), intervalPrefix: "~",
    seconds: t("chart.unit.seconds"), minutes: t("chart.unit.minutes"),
    hours: t("chart.unit.hours"), days: t("chart.unit.days"),
    onlyEssential: t("chart.control.onlyEssential"), onlyDetail: t("chart.control.onlyDetail"),
    categoryEssential: t("chart.control.categoryEssential"), categoryDetail: t("chart.control.categoryDetail"),
    searchPlaceholder: t("chart.control.searchPlaceholder"), noResults: t("chart.control.noResults"),
  }), [t]);

  const fireLabels: FirePanelCardLabels = useMemo(() => ({
    online: t("common.online"),
    normal: t("status.normal"), warning: t("status.warning"), alarm: t("status.active"),
    fireDetected: t("fire.status.fire"), fireNone: t("fire.status.none"),
    faultExists: t("fire.status.exists"), faultNone: t("fire.status.none"),
    firstStage: t("fire.relay.firstStage"), secondStage: t("fire.relay.secondStage"),
    discharged: t("fire.relay.discharged"), extract: t("fire.relay.extract"),
    hold: t("fire.relay.hold"), abort: t("fire.cancel"),
    modeAuto: t("fire.relay.modeAuto"), localFire: t("fire.relay.localFire"),
    reset: t("fire.relay.reset"),
    detail: t("common.detail"),
  }), [t]);

  if (isLoading) {
    return <S.Loading>{t("common.loading")}</S.Loading>;
  }

  const systemOk = !state.fault && !state.fire && !state.firstStage && !state.secondStage;
  const systemFire = state.fire || state.localFire;
  const systemFault = state.fault;

  return (
    <>
      <S.Container>
        <S.TopCards>
          <S.StatusCard $variant={systemOk ? "ok" : "alarm"}>
            <S.CardIcon><SCADA_ICONS.statusOnline size={32} /></S.CardIcon>
            <S.CardValue $variant={systemOk ? "ok" : "alarm"}>
              {systemOk ? t("status.normal") : t("status.warning")}
            </S.CardValue>
            <S.CardLabel $variant={systemOk ? "ok" : "alarm"}>
              {t("fire.systemStatus")}
            </S.CardLabel>
          </S.StatusCard>
          <S.StatusCard $variant={systemFire ? "alarm" : "ok"}>
            <S.CardIcon><SCADA_ICONS.logWarning size={32} /></S.CardIcon>
            <S.CardValue $variant={systemFire ? "alarm" : "ok"}>
              {systemFire ? t("fire.status.fire") : t("fire.status.none")}
            </S.CardValue>
            <S.CardLabel $variant={systemFire ? "alarm" : "ok"}>
              {t("fire.status.fireCondition")}
            </S.CardLabel>
          </S.StatusCard>
          <S.StatusCard $variant={systemFault ? "fault" : "ok"}>
            <S.CardIcon><SCADA_ICONS.statusOffline size={32} /></S.CardIcon>
            <S.CardValue $variant={systemFault ? "fault" : "ok"}>
              {systemFault ? t("fire.status.exists") : t("fire.status.none")}
            </S.CardValue>
            <S.CardLabel $variant={systemFault ? "fault" : "ok"}>
              {t("fire.status.error")}
            </S.CardLabel>
          </S.StatusCard>
        </S.TopCards>

        <FirePanelCard deviceId="EP203" state={state}
          labels={fireLabels} onDetailClick={() => setSelectedDeviceId("EP203")} />

        <div style={{ marginTop: 24 }}>
          <SingleTelemetryChart provider={fireProvider} telemetryNames={fireNames}
            title="EP203 — Yangın Paneli" yAxisLabel="Değer" height={400}
            labels={chartLabels} locale={loc} />
        </div>
      </S.Container>
      <DeviceDetailModal deviceId={selectedDeviceId} open={selectedDeviceId !== null} onClose={() => setSelectedDeviceId(null)} />
    </>
  );
};

FirePanelPage.displayName = "FirePanelPage";
