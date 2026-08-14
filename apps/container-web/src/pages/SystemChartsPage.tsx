import React, { useMemo } from "react";
import { SingleTelemetryChart, useTranslation } from "@gd-monorepo/ui";
import type { TelemetryChartLabels } from "@gd-monorepo/ui";
import * as S from "./SystemChartsPage.styles";
import { useTelemetryProvider } from "../hooks/useTelemetryProvider";
import { useTelemetryNames } from "../hooks/useTelemetryNames";
import { useEventAnnotations } from "../hooks/useEventAnnotations";
import { useDevicesStore } from "../stores/devicesStore";

const SYSTEM_CHART_DEFAULTS = [
  "BSC SOC", "BSC SOH", "BSC DC Voltage", "BSC DC Current",
  "Charge Power Limit", "Discharge Power Limit", "BSC State",
];

export const SystemChartsPage: React.FC = () => {
  const { t, locale } = useTranslation();
  const loc = locale();
  const devices = useDevicesStore((s) => s.devices);
  const bscIds = useMemo(
    () =>
      devices
        .filter((d) => d.type === "bsc" || d.type === "xrack")
        .map((d) => d.id),
    [devices],
  );

  const { names: rawTelemetryNames } = useTelemetryNames(bscIds, "system");
  const telemetryNames = useMemo(
    () => rawTelemetryNames.length > 0 ? rawTelemetryNames : SYSTEM_CHART_DEFAULTS,
    [rawTelemetryNames],
  );
  const telemetryProvider = useTelemetryProvider({
    telemetryNames,
    defaultRange: "1h",
    defaultPoints: 200,
    deviceIds: bscIds,
    filters: { rack_id: "system" },
  });
  const eventAnnotations = useEventAnnotations(telemetryProvider.range);

  const chartLabels: TelemetryChartLabels = useMemo(
    () => ({
      range1m: t("chart.range.1m"),
      range1h: t("chart.range.1h"),
      range1d: t("chart.range.1d"),
      range1w: t("chart.range.1w"),
      range1M: t("chart.range.1M"),
      range3M: t("chart.range.3M"),
      range6M: t("chart.range.6M"),
      range1y: t("chart.range.1y"),
      rangeCustom: t("chart.range.custom"),
      rangeFrom: t("chart.range.from"),
      rangeTo: t("chart.range.to"),
      pointsLow: t("chart.control.points.low"),
      pointsStandard: t("chart.control.points.standard"),
      pointsHigh: t("chart.control.points.high"),
      pointsMax: t("chart.control.points.max"),
      timeRange: t("chart.control.timeRange"),
      points: t("chart.control.points"),
      metric: t("chart.control.metric"),
      all: t("common.all"),
      none: t("common.none"),
      selected: t("common.selected"),
      systemEvents: t("chart.control.systemEvents"),
      userActions: t("chart.control.userActions"),
      correctedEvents: t("chart.control.correctedEvents"),
      loadFailed: t("error.loadFailed"),
      loading: t("common.loading"),
      waitingData: t("common.waitingData"),
      noData: t("common.noData"),
      stats: t("chart.control.stats"),
      pointsUnit: t("chart.subtitle.points"),
      intervalPrefix: "~",
      seconds: t("chart.unit.seconds"),
      minutes: t("chart.unit.minutes"),
      hours: t("chart.unit.hours"),
      days: t("chart.unit.days"),
      onlyEssential: t("chart.control.onlyEssential"),
      onlyDetail: t("chart.control.onlyDetail"),
      categoryEssential: t("chart.control.categoryEssential"),
      categoryDetail: t("chart.control.categoryDetail"),
      searchPlaceholder: t("chart.control.searchPlaceholder"),
      noResults: t("chart.control.noResults"),
    }),
    [t],
  );

  return (
    <S.SystemChartsPageContainer>
      <SingleTelemetryChart
        provider={telemetryProvider}
        telemetryNames={telemetryNames}
        title={t("nav.analytics")}
        yAxisLabel="Değer"
        height={500}
        labels={chartLabels}
        locale={loc}
        eventAnnotations={eventAnnotations}
      />
    </S.SystemChartsPageContainer>
  );
};
