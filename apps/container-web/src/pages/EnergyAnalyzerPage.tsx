import React, { useMemo, useState } from "react";
import { EnergyAnalyzerCard, SingleTelemetryChart, SCADA_ICONS, useTranslation } from "@gd-monorepo/ui";
import type { EnergyAnalyzerCardLabels, TelemetryChartLabels } from "@gd-monorepo/ui";
import { useEnergyAnalyzerData } from "../features/energy-analyzer";
import { useTelemetryProvider } from "../hooks/useTelemetryProvider";
import { useTelemetryNames } from "../hooks/useTelemetryNames";
import { DeviceDetailModal } from "../features/devices/components/DeviceDetailModal";
import * as S from "./EnergyAnalyzerPage.styles";

export const EnergyAnalyzerPage: React.FC = () => {
  const { t, locale } = useTranslation();
  const loc = locale();
  const { summaries, deviceIds, isLoading } = useEnergyAnalyzerData();
  const summary = summaries[0];
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);

  const eaIds = deviceIds.length > 0 ? deviceIds : ["PM5340"];
  const { names: eaNames } = useTelemetryNames(eaIds);
  const eaProvider = useTelemetryProvider({ telemetryNames: eaNames, defaultRange: "1h", defaultPoints: 200, deviceIds: eaIds });

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
    loadFailed: t("error.loadFailed"), loading: t("common.loading"), noData: t("common.noData"),
    pointsUnit: t("chart.subtitle.points"), intervalPrefix: "~",
    seconds: t("chart.unit.seconds"), minutes: t("chart.unit.minutes"),
    hours: t("chart.unit.hours"), days: t("chart.unit.days"),
    onlyEssential: t("chart.control.onlyEssential"), onlyDetail: t("chart.control.onlyDetail"),
    categoryEssential: t("chart.control.categoryEssential"), categoryDetail: t("chart.control.categoryDetail"),
    searchPlaceholder: t("chart.control.searchPlaceholder"), noResults: t("chart.control.noResults"),
  }), [t]);

  const eaLabels: EnergyAnalyzerCardLabels = useMemo(() => ({
    online: t("common.online"),
    frequency: t("energyAnalyzer.frequency"),
    activePower: t("energyAnalyzer.activePower"),
    energy: t("energyAnalyzer.energy"),
    phaseA: t("energyAnalyzer.phaseA"), phaseB: t("energyAnalyzer.phaseB"), phaseC: t("energyAnalyzer.phaseC"),
    voltageLN: t("energyAnalyzer.voltageLN"), voltageLL: t("energyAnalyzer.voltageLL"),
    current: t("energyAnalyzer.current"), reactivePower: t("energyAnalyzer.reactivePower"),
    apparentPower: t("energyAnalyzer.apparentPower"), powerFactor: t("energyAnalyzer.powerFactor"),
    thdCurrent: t("energyAnalyzer.thdCurrent"), thdVoltage: t("energyAnalyzer.thdVoltage"),
    neutral: t("energyAnalyzer.neutral"), demandPowerPresent: t("energyAnalyzer.demandPowerPresent"),
    demandPowerPeak: t("energyAnalyzer.demandPowerPeak"), demandCurrentPresent: t("energyAnalyzer.demandCurrentPresent"),
    reactiveEnergyDelivered: t("energyAnalyzer.reactiveEnergyDelivered"),
    reactiveEnergyReceived: t("energyAnalyzer.reactiveEnergyReceived"),
    apparentEnergy: t("energyAnalyzer.apparentEnergy"),
    activeEnergyReceived: t("energyAnalyzer.activeEnergyReceived"),
    detail: t("common.detail"),
  }), [t]);

  const totalActive = useMemo(
    () => summary ? summary.phaseA.activePower + summary.phaseB.activePower + summary.phaseC.activePower : 0,
    [summary],
  );

  if (isLoading) {
    return <S.Loading>{t("common.loading")}</S.Loading>;
  }

  if (!summary) {
    return <S.Empty>{t("energyAnalyzer.nodata")}</S.Empty>;
  }

  return (
    <>
      <S.Container>
        <S.TopCards>
          <S.StatusCard $variant="ok">
            <S.CardIcon><SCADA_ICONS.timer size={32} /></S.CardIcon>
            <S.CardValue $variant="ok">{summary.frequency.toFixed(2)} Hz</S.CardValue>
            <S.CardLabel $variant="ok">{t("energyAnalyzer.frequency")}</S.CardLabel>
          </S.StatusCard>
          <S.StatusCard $variant="ok">
            <S.CardIcon><SCADA_ICONS.batteryCharge size={32} /></S.CardIcon>
            <S.CardValue $variant="ok">{totalActive.toFixed(1)} kW</S.CardValue>
            <S.CardLabel $variant="ok">{t("energyAnalyzer.activePower")}</S.CardLabel>
          </S.StatusCard>
          <S.StatusCard $variant="ok">
            <S.CardIcon><SCADA_ICONS.powerPlug size={32} /></S.CardIcon>
            <S.CardValue $variant="ok">{summary.activeEnergyDelivered.toFixed(1)} kWh</S.CardValue>
            <S.CardLabel $variant="ok">{t("energyAnalyzer.activeEnergyDelivered")}</S.CardLabel>
          </S.StatusCard>
        </S.TopCards>

        <EnergyAnalyzerCard summary={summary} totalActivePower={totalActive}
          labels={eaLabels} onDetailClick={() => setSelectedDeviceId(summary.deviceId)} />

        <div style={{ marginTop: 24 }}>
          <SingleTelemetryChart provider={eaProvider} telemetryNames={eaNames}
            title={summary.deviceId} yAxisLabel="Değer" height={400}
            labels={chartLabels} locale={loc} />
        </div>
      </S.Container>
      <DeviceDetailModal deviceId={selectedDeviceId} open={selectedDeviceId !== null} onClose={() => setSelectedDeviceId(null)} />
    </>
  );
};

EnergyAnalyzerPage.displayName = "EnergyAnalyzerPage";
