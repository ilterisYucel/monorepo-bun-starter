import React, { useState, useMemo } from "react";
import { RackCard, BSCCard, SingleTelemetryChart, useTranslation } from "@gd-monorepo/ui";
import type { BSCCardLabels, RackCardLabels, TelemetryChartLabels } from "@gd-monorepo/ui";
import { RackDetailModal } from "../features/racks/components/RackDetailModal";
import type { RackDetailData } from "../features/racks/components/RackDetailModal";
import * as S from "./RacksPage.styles";
import { useChargeStatus } from "../hooks/useChargeStatus";
import { useRacksData } from "../features/racks/hooks/useRacksData";
import { telemetriesToBscSummaries } from "../features/racks/utils/bscHelpers";
import { useTelemetryProvider } from "../hooks/useTelemetryProvider";
import { useTelemetryNames } from "../hooks/useTelemetryNames";
import { useEventAnnotations } from "../hooks/useEventAnnotations";
import { useDevicesStore } from "../stores/devicesStore";

export const RacksPage: React.FC = () => {
  const { t, locale } = useTranslation();
  const loc = locale();
  const { chargeStatus } = useChargeStatus();
  const { racks, rackDetails, mergedTelemetries, isLoading } = useRacksData(chargeStatus);
  const devices = useDevicesStore((s) => s.devices);
  const bscDevices = useMemo(
    () => devices.filter((d) => d.type === "bsc" || d.type === "xrack"),
    [devices],
  );
  const bscSummaries = useMemo(
    () => telemetriesToBscSummaries(mergedTelemetries, chargeStatus, bscDevices),
    [mergedTelemetries, chargeStatus, bscDevices],
  );
  const bscIds = useMemo(() => bscDevices.map((d) => d.id), [bscDevices]);
  const { names: telemetryNames } = useTelemetryNames(bscIds);
  const rackTelemetryProvider = useTelemetryProvider({
    telemetryNames,
    defaultRange: "1h",
    defaultPoints: 200,
    deviceIds: bscIds,
  });
  const eventAnnotations = useEventAnnotations(rackTelemetryProvider.range);
  const [detailData, setDetailData] = useState<RackDetailData | null>(null);

  const tagFilterList = useMemo(() => [
    { tagKey: "deviceId", label: "Cihaz" },
    { tagKey: "rack_id", label: "Rack Numarası" },
  ], []);

  const bscLabels: BSCCardLabels = useMemo(() => ({
    online: t("common.online"),
    offline: t("common.offline"),
    charging: t("device.chargeStatus.Charge"),
    discharging: t("device.chargeStatus.Discharge"),
    idle: t("device.chargeStatus.Idle"),
    voltage: t("device.voltage"),
    current: t("device.current"),
    chargePower: t("device.chargePower"),
    dischargePower: t("device.dischargePower"),
    anticipatedVoltage: t("device.anticipatedVoltage"),
    maxTemperature: t("device.maxTemperature"),
    version: t("device.version"),
    state: t("device.state"),
    heartbeat: t("device.heartbeat"),
    commandResponse: t("device.commandResponse"),
    lastCommand: t("device.lastCommand"),
    rack: t("device.rack"),
    systemPower: t("device.systemPower"),
    systemSoc: t("device.systemSoc"),
    systemSoh: t("device.systemSoh"),
    active: t("status.active"),
    detail: t("common.detail"),
  }), [t]);

  const rackLabels: RackCardLabels = useMemo(() => ({
    online: t("common.online"),
    offline: t("common.offline"),
    charging: t("device.chargeStatus.Charge"),
    discharging: t("device.chargeStatus.Discharge"),
    idle: t("device.chargeStatus.Idle"),
    voltage: t("device.voltage"),
    current: t("device.current"),
    power: t("device.power"),
    temperature: t("device.temperature"),
    detail: t("common.detail"),
  }), [t]);

  const chartLabels: TelemetryChartLabels = useMemo(() => ({
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
  }), [t]);

  return (
    <S.RacksPageContainer>
      {isLoading ? (
        <S.LoadingContainer>
          <S.Spinner />
          <p>{t("common.loading")}</p>
        </S.LoadingContainer>
      ) : (
        <>
          <S.BSCSectionGrid>
            {bscSummaries.map((bsc, idx) => {
              const bscRacks = racks.filter(
                (r) => r.deviceId === bscDevices[idx]?.id,
              );
              return (
                <S.BSCSection key={bsc.name}>
                  <BSCCard {...bsc} labels={bscLabels} />
                  <S.RackSubGrid>
                    {bscRacks.map((rack) => (
                      <RackCard
                        key={`${rack.deviceId}-${rack.id}`}
                        {...rack}
                        charge_status={chargeStatus}
                        labels={rackLabels}
                        onDetailClick={() => {
                          const detail = rackDetails.get(
                            `${rack.deviceId}-${rack.id}`,
                          );
                          if (detail) setDetailData(detail);
                        }}
                      />
                    ))}
                  </S.RackSubGrid>
                </S.BSCSection>
              );
            })}
          </S.BSCSectionGrid>
          <SingleTelemetryChart
            provider={rackTelemetryProvider}
            telemetryNames={telemetryNames}
            title={t("nav.racks")}
            yAxisLabel="Değer"
            height={550}
            labels={chartLabels}
            locale={loc}
            tagFilters={tagFilterList}
            eventAnnotations={eventAnnotations}
            defaultMetric="SOC"
            defaultTagSelections={{ deviceId: bscIds.length > 0 ? [bscIds[0]] : [], rack_id: ["1"] }}
          />
        </>
      )}
      <RackDetailModal
        data={detailData}
        open={detailData !== null}
        onClose={() => setDetailData(null)}
      />
    </S.RacksPageContainer>
  );
};
