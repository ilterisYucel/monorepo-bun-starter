import React, { useMemo, useState } from "react";
import {
  HvacCard, SingleTelemetryChart, TelemetryChart,
  SummaryCard, SectionHeader, CardGrid,
  SCADA_ICONS, useTranslation,
} from "@gd-monorepo/ui";
import type { HvacCardLabels, TelemetryChartLabels } from "@gd-monorepo/ui";
import { useHvacData } from "../features/hvac";
import { useTelemetryProvider } from "../hooks/useTelemetryProvider";
import { useTelemetryNames } from "../hooks/useTelemetryNames";
import { useEventAnnotations } from "../hooks/useEventAnnotations";
import { DeviceDetailModal } from "../features/devices/components/DeviceDetailModal";
import * as S from "./HvacPage.styles";

export const HvacPage: React.FC = () => {
  const { t, locale } = useTranslation();
  const loc = locale();
  const { units: hvacUnits, averages: hvacAvg, isLoading } = useHvacData();
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);

  const hvacIds = useMemo(() => hvacUnits.map(u => u.deviceId), [hvacUnits]);
  const { names: hvacNames } = useTelemetryNames(hvacIds.length > 0 ? hvacIds : ["HVAC-1"]);
  const hvacProvider = useTelemetryProvider({ telemetryNames: hvacNames, defaultRange: "1h", defaultPoints: 200, deviceIds: hvacIds.length > 0 ? hvacIds : ["HVAC-1"] });
  const eventAnnotations = useEventAnnotations(hvacProvider.range);

  const hvacLabels: HvacCardLabels = useMemo(() => ({
    running: "Çalışıyor", standby: "Beklemede", fault: "Arıza",
    cooling: "Soğutma", warming: "Isıtma", idle: "Beklemede",
    currentTemp: t("device.currentTemp"), setTemp: "Hedef Sıcaklık",
    supplyTemp: "Üfleme Sıcaklığı", returnTemp: "Dönüş Sıcaklığı",
    returnHumidity: "Dönüş Nemi", supplyHumidity: "Üfleme Nemi",
    equipment: "Ekipman", normal: "Normal", alarms: "Alarm",
    detail: t("common.detail"),
  }), [t]);

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

  const unitModes = useMemo(() => hvacUnits.map(unit => {
    if (unit.status !== "running") return "idle" as const;
    if (unit.coolingSetpoint != null && unit.currentTemp != null && unit.currentTemp > unit.coolingSetpoint) return "cooling" as const;
    if (unit.heatingSetpoint != null && unit.currentTemp != null && unit.currentTemp < unit.heatingSetpoint) return "warming" as const;
    return "idle" as const;
  }), [hvacUnits]);

  if (isLoading) {
    return <S.LoadingContainer><S.Spinner /><p>{t("common.loading")}</p></S.LoadingContainer>;
  }

  return (
    <>
      <S.PageContainer>
      <S.SummaryRow>
        <SummaryCard icon={<SCADA_ICONS.temperature size={28} />} value={`${hvacAvg.avgCurrentTemp.toFixed(1)}°C`} label="Ortalama Sıcaklık" variant="hvac" />
        <SummaryCard icon={<SCADA_ICONS.hvacUnit size={28} />} value={`%${hvacAvg.avgReturnHumidity.toFixed(1)}`} label="Ortalama Nem" variant="info" />
        <SummaryCard icon={<SCADA_ICONS.hvac size={28} />} value={`${hvacAvg.runningUnits}/${hvacAvg.totalUnits}`} label="Çalışan Ünite" variant="hvac" />
        <SummaryCard icon={<SCADA_ICONS.statusOnline size={28} />} value="Normal" label="Sistem Durumu" variant="ok" />
      </S.SummaryRow>

      <SectionHeader title="HVAC Üniteleri" />
      <CardGrid>
        {hvacUnits.map((unit, idx) => {
          const alarmCount = Object.values(unit.alarms).filter(Boolean).length;
          return (
            <HvacCard key={unit.deviceId} name={unit.name} room={unit.room}
              status={unit.status} currentTemp={unit.currentTemp} mode={unitModes[idx] ?? "idle"}
              setTemp={unit.coolingSetpoint ?? unit.heatingSetpoint ?? null}
              supplyTemp={unit.supplyTemp ?? null} returnTemp={unit.evaporatorTemp ?? null}
              returnHumidity={unit.returnHumidity ?? null}
              equipmentStatus={unit.status === "running" ? "Normal" : unit.status === "fault" ? "Arıza" : "Beklemede"}
              alarmCount={alarmCount} labels={hvacLabels} onDetailClick={() => setSelectedDeviceId(unit.deviceId)} />
          );
        })}
      </CardGrid>

      {hvacIds.length > 0 && (
        <>
          <S.ChartRow>
            {hvacIds.map((id) => (
              <SingleTelemetryChart key={id} provider={hvacProvider} telemetryNames={hvacNames}
                title={id} yAxisLabel="Değer" height={350}
                labels={chartLabels} locale={loc}
                tagFilters={[{ tagKey: "deviceId", label: "Cihaz" }]}
                defaultTagSelections={{ deviceId: [id] }} />
            ))}
          </S.ChartRow>

          <S.UnifiedChartWrap>
            <TelemetryChart provider={hvacProvider} telemetryNames={hvacNames}
              title="HVAC — Karşılaştırmalı" yAxisLabel="Değer" height={450}
              labels={chartLabels} locale={loc}
              tagFilters={[{ tagKey: "deviceId", label: "Cihaz" }]}
              eventAnnotations={eventAnnotations} />
          </S.UnifiedChartWrap>
        </>
      )}
    </S.PageContainer>
    <DeviceDetailModal deviceId={selectedDeviceId} open={selectedDeviceId !== null} onClose={() => setSelectedDeviceId(null)} />
  </>
  );
};

HvacPage.displayName = "HvacPage";
