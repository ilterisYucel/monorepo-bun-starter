import React, { useMemo, useState } from "react";
import {
  BSCCard, RackCard, CBCard, DCOutputCard,
  SingleTelemetryChart,
  SummaryCard, SectionHeader, CardGrid,
  SCADA_ICONS, useTranslation,
} from "@gd-monorepo/ui";
import type { BSCCardLabels, RackCardLabels, CBCardLabels, DCOutputCardLabels, TelemetryChartLabels } from "@gd-monorepo/ui";
import { useChargeStatus } from "../hooks/useChargeStatus";
import { useDashboardData } from "../features/dashboard/hooks/useDashboardData";
import { useRacksData } from "../features/racks/hooks/useRacksData";
import { RackDetailModal } from "../features/racks/components/RackDetailModal";
import type { RackDetailData } from "../features/racks/components/RackDetailModal/RackDetailModal.types";
import { DeviceDetailModal } from "../features/devices/components/DeviceDetailModal";
import { useDevicesStore } from "../stores/devicesStore";
import { useRealtimeStream } from "../contexts/RealtimeContext";
import { useTelemetryProvider } from "../hooks/useTelemetryProvider";
import { useTelemetryNames } from "../hooks/useTelemetryNames";
import * as S from "./BscPage.styles";

export const BscPage: React.FC = () => {
  const { t, locale } = useTranslation();
  const loc = locale();
  const { chargeStatus } = useChargeStatus();
  const { racks, averages, isLoading } = useDashboardData(chargeStatus);
  const { rackDetails } = useRacksData(chargeStatus);
  const [detailData, setDetailData] = useState<RackDetailData | null>(null);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const devices = useDevicesStore((s) => s.devices);
  const { data: realtimeData } = useRealtimeStream();

  const bscDevices = useMemo(() => devices.filter((d) => d.type === "bsc" || d.id?.startsWith("BSC-")), [devices]);
  const cbDevices = useMemo(() => devices.filter((d) => d.type === "cb" || d.id?.startsWith("CB-")), [devices]);
  const dcDevices = useMemo(() => devices.filter((d) => d.type === "dc-output" || d.id?.startsWith("DC-")), [devices]);

  const bsc1Id = bscDevices[0]?.id ?? "BSC-1";
  const bsc2Id = bscDevices[1]?.id ?? "BSC-2";
  const bscIds = useMemo(() => bscDevices.map(d => d.id), [bscDevices]);
  const cbIds = useMemo(() => cbDevices.map(d => d.id), [cbDevices]);
  const dcIds = useMemo(() => dcDevices.map(d => d.id), [dcDevices]);

  const racksByDevice = useMemo(() => {
    const map = new Map<string, typeof racks>();
    for (const device of bscDevices) {
      map.set(device.id, racks.filter(r => r.deviceId === device.id));
    }
    return map;
  }, [racks, bscDevices]);

  const bsc1Racks = racksByDevice.get(bscDevices[0]?.id) ?? [];
  const bsc2Racks = racksByDevice.get(bscDevices[1]?.id) ?? [];

  const rackAvg = (rks: typeof bsc1Racks, field: "soc" | "soh" | "voltage" | "current" | "power_kw") => {
    const vals = rks.map(r => r[field]).filter(v => v != null) as number[];
    return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  };

  const bsc1Summary = { soc: rackAvg(bsc1Racks, "soc"), soh: rackAvg(bsc1Racks, "soh"), voltage: rackAvg(bsc1Racks, "voltage"), current: rackAvg(bsc1Racks, "current"), power: rackAvg(bsc1Racks, "power_kw"), online: bsc1Racks.filter(r => r.status === "online").length, total: bsc1Racks.length };
  const bsc2Summary = { soc: rackAvg(bsc2Racks, "soc"), soh: rackAvg(bsc2Racks, "soh"), voltage: rackAvg(bsc2Racks, "voltage"), current: rackAvg(bsc2Racks, "current"), power: rackAvg(bsc2Racks, "power_kw"), online: bsc2Racks.filter(r => r.status === "online").length, total: bsc2Racks.length };

  const { names: bsc1Names } = useTelemetryNames([bsc1Id]);
  const { names: bsc2Names } = useTelemetryNames([bsc2Id]);
  const { names: allBscNames } = useTelemetryNames(bscIds);
  const { names: cbNames } = useTelemetryNames(cbIds.length > 0 ? cbIds : ["CB-1"]);
  const { names: dcNames } = useTelemetryNames(dcIds.length > 0 ? dcIds : ["DC-1"]);

  const bsc1Provider = useTelemetryProvider({ telemetryNames: bsc1Names, defaultRange: "1h", defaultPoints: 200, deviceIds: [bsc1Id] });
  const bsc2Provider = useTelemetryProvider({ telemetryNames: bsc2Names, defaultRange: "1h", defaultPoints: 200, deviceIds: [bsc2Id] });
  const allBscProvider = useTelemetryProvider({ telemetryNames: allBscNames, defaultRange: "1h", defaultPoints: 200, deviceIds: bscIds });
  const cbProvider = useTelemetryProvider({ telemetryNames: cbNames, defaultRange: "1h", defaultPoints: 200, deviceIds: cbIds.length > 0 ? cbIds : ["CB-1"] });
  const dcProvider = useTelemetryProvider({ telemetryNames: dcNames, defaultRange: "1h", defaultPoints: 200, deviceIds: dcIds.length > 0 ? dcIds : ["DC-1"] });

  const cbStatuses = useMemo(() => bscDevices.map((_, idx) => {
    const tripped = realtimeData.find(d => d.deviceId === `CB-${idx + 1}` && d.name === "Is Tripped");
    const closed = realtimeData.find(d => d.deviceId === `CB-${idx + 1}` && d.name === "Is Closed");
    return { isTripped: !!(tripped && (tripped.value === 1 || tripped.value === true)), isClosed: !!(closed && (closed.value === 1 || closed.value === true)) };
  }), [bscDevices, realtimeData]);

  const dcStatuses = useMemo(() => bscDevices.map((_, idx) => {
    const entries = realtimeData.filter(d => d.deviceId === `DC-${idx + 1}`);
    const isOn = entries.find(d => d.name === "Is On"); const volt = entries.find(d => d.name === "Actual Voltage"); const curr = entries.find(d => d.name === "Actual Current");
    return { isOn: !!(isOn && (isOn.value === 1 || isOn.value === true)), voltage: (volt?.value as number) ?? null, current: (curr?.value as number) ?? null };
  }), [bscDevices, realtimeData]);

  const bscLabels: BSCCardLabels = useMemo(() => ({
    online: t("common.online"), offline: t("common.offline"),
    charging: t("device.chargeStatus.Charge"), discharging: t("device.chargeStatus.Discharge"), idle: t("device.chargeStatus.Idle"),
    voltage: t("device.voltage"), current: t("device.current"),
    chargePower: t("device.chargePower"), dischargePower: t("device.dischargePower"),
    anticipatedVoltage: t("device.anticipatedVoltage"), maxTemperature: t("device.maxTemperature"),
    version: t("device.version"), state: t("device.state"), heartbeat: t("device.heartbeat"),
    commandResponse: t("device.commandResponse"), lastCommand: t("device.lastCommand"),
    rack: t("device.rack"), systemPower: t("device.systemPower"),
    systemSoc: t("device.systemSoc"), systemSoh: t("device.systemSoh"),
    active: t("status.active"), detail: t("common.detail"),
  }), [t]);

  const rackLabels: RackCardLabels = useMemo(() => ({
    online: t("common.online"), offline: t("common.offline"),
    charging: t("device.chargeStatus.Charge"), discharging: t("device.chargeStatus.Discharge"), idle: t("device.chargeStatus.Idle"),
    voltage: t("device.voltage"), current: t("device.current"), power: t("device.power"),
    temperature: t("device.temperature"), detail: t("common.detail"),
  }), [t]);

  const cbLabels: CBCardLabels = useMemo(() => ({
    online: t("common.online"), offline: t("common.offline"),
    closed: "Kapalı", open: "Açık", tripped: "Atmış", normal: "Normal",
    voltage: t("device.voltage"), current: t("device.current"),
    tripCount: "Açma Sayısı", closeCount: "Kapama Sayısı", detail: t("common.detail"),
  }), [t]);

  const dcLabels: DCOutputCardLabels = useMemo(() => ({
    online: t("common.online"), offline: t("common.offline"),
    on: "Açık", off: "Kapalı",
    actualVoltage: "Gerçek Voltaj", actualCurrent: "Gerçek Akım",
    setVoltage: "Ayar Voltajı", setCurrent: "Ayar Akımı", detail: t("common.detail"),
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
    loadFailed: t("error.loadFailed"), loading: t("common.loading"), waitingData: t("common.waitingData"), noData: t("common.noData"), stats: t("chart.control.stats"),
    pointsUnit: t("chart.subtitle.points"), intervalPrefix: "~",
    seconds: t("chart.unit.seconds"), minutes: t("chart.unit.minutes"),
    hours: t("chart.unit.hours"), days: t("chart.unit.days"),
    onlyEssential: t("chart.control.onlyEssential"), onlyDetail: t("chart.control.onlyDetail"),
    categoryEssential: t("chart.control.categoryEssential"), categoryDetail: t("chart.control.categoryDetail"),
    searchPlaceholder: t("chart.control.searchPlaceholder"), noResults: t("chart.control.noResults"),
  }), [t]);

  if (isLoading) {
    return <S.LoadingContainer><S.Spinner /><p>{t("common.loading")}</p></S.LoadingContainer>;
  }

  const renderBscColumn = (deviceId: string, summary: typeof bsc1Summary, provider: typeof bsc1Provider, names: typeof bsc1Names) => (
    <S.Column>
      <S.Summary2x2>
        <SummaryCard icon={<SCADA_ICONS.batteryCharge size={28} />} value={`%${summary.soc.toFixed(1)}`} label="SoC" variant="bsc" />
        <SummaryCard icon={<SCADA_ICONS.health size={28} />} value={`%${summary.soh.toFixed(1)}`} label="SoH" variant="cb" />
        <SummaryCard icon={<SCADA_ICONS.powerPlug size={28} />} value={`${summary.power.toFixed(1)} kW`} label="Güç" variant="bsc" />
        <SummaryCard icon={<SCADA_ICONS.battery size={28} />} value={`${summary.voltage.toFixed(1)} V`} label="Voltaj" variant="dc" />
      </S.Summary2x2>
      <BSCCard name={deviceId} status="online" chargeStatus={chargeStatus}
        soc={summary.soc} soh={summary.soh} rackCount={summary.total} onlineRackCount={summary.online}
        systemPowerKw={summary.power} voltage={summary.voltage} current={summary.current}
        chargePowerKw={chargeStatus === "Charge" ? summary.power : 0}
        dischargePowerKw={chargeStatus === "Discharge" ? summary.power : 0}
        anticipatedVoltage={summary.voltage} temperature={24}
        version="1.0" state="Aktif" heartbeat="OK" requestAck="OK" lastAcceptedReq="—"
        labels={bscLabels} onDetailClick={() => setSelectedDeviceId(deviceId)} />
    </S.Column>
  );

  return (
    <>
      <S.PageContainer>
        <SectionHeader title={t("nav.bsc")} />

        <S.TwoColumnLayout>
          {renderBscColumn(bsc1Id, bsc1Summary, bsc1Provider, bsc1Names)}
          {renderBscColumn(bsc2Id, bsc2Summary, bsc2Provider, bsc2Names)}
        </S.TwoColumnLayout>

        {((bsc1Racks.length + bsc2Racks.length) > 0) && (
          <>
            <SectionHeader title="RACK'LER" />
            <CardGrid>
              {[...bsc1Racks, ...bsc2Racks].map((rack, ri) => {
                const renamedRack = { ...rack, name: `Rack-${ri + 1}`, id: ri + 1 };
                return (
                  <RackCard key={`${rack.deviceId}-${rack.id}`} {...renamedRack}
                    charge_status={chargeStatus} labels={rackLabels}
                    onDetailClick={() => {
                      const detail = rackDetails.get(`${rack.deviceId}-${rack.id}`);
                      if (detail) setDetailData(detail);
                    }} />
                );
              })}
            </CardGrid>
          </>
        )}

        <S.ChartRow>
          <SingleTelemetryChart provider={bsc1Provider} telemetryNames={bsc1Names}
            title={bsc1Id} yAxisLabel="Değer" height={400}
            labels={chartLabels} locale={loc} />
          <SingleTelemetryChart provider={bsc2Provider} telemetryNames={bsc2Names}
            title={bsc2Id} yAxisLabel="Değer" height={400}
            labels={chartLabels} locale={loc} />
        </S.ChartRow>

        <S.UnifiedChartWrap>
          <SingleTelemetryChart provider={allBscProvider} telemetryNames={allBscNames}
            title="BSC Karşılaştırma" yAxisLabel="Değer" height={450}
            labels={chartLabels} locale={loc}
            tagFilters={[{ tagKey: "deviceId", label: "Cihaz" }]} />
        </S.UnifiedChartWrap>

        {cbDevices.length > 0 && (
          <>
            <SectionHeader title="CIRCUIT BREAKER'LAR" />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
              {cbDevices.map((device, idx) => (
                <CBCard key={device.id} name={device.id} status="online"
                  isClosed={cbStatuses[idx]?.isClosed ?? true} isTripped={cbStatuses[idx]?.isTripped ?? false}
                  voltage={dcStatuses[idx]?.voltage ?? null} current={dcStatuses[idx]?.current ?? null}
                  tripCount={0} closeCount={0} labels={cbLabels} onDetailClick={() => setSelectedDeviceId(device.id)} />
              ))}
            </div>

            <S.ChartRow>
              {cbIds.map((id) => (
                <SingleTelemetryChart key={id} provider={cbProvider} telemetryNames={cbNames}
                  title={id} yAxisLabel="Değer" height={350}
                  labels={chartLabels} locale={loc}
                  tagFilters={[{ tagKey: "deviceId", label: "Cihaz" }]}
                  defaultTagSelections={{ deviceId: [id] }} />
              ))}
            </S.ChartRow>

            <S.UnifiedChartWrap>
              <SingleTelemetryChart provider={cbProvider} telemetryNames={cbNames}
                title="Circuit Breaker — Karşılaştırmalı" yAxisLabel="Değer" height={450}
                labels={chartLabels} locale={loc}
                tagFilters={[{ tagKey: "deviceId", label: "Cihaz" }]} />
            </S.UnifiedChartWrap>
          </>
        )}

        {dcDevices.length > 0 && (
          <>
            <SectionHeader title="DC OUTPUT'LAR" />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
              {dcDevices.map((device, idx) => (
                <DCOutputCard key={device.id} name={device.id} status="online"
                  isOn={dcStatuses[idx]?.isOn ?? true}
                  actualVoltage={dcStatuses[idx]?.voltage ?? null}
                  actualCurrent={dcStatuses[idx]?.current ?? null}
                  setVoltage={400} setCurrent={80}
                  labels={dcLabels} onDetailClick={() => setSelectedDeviceId(device.id)} />
              ))}
            </div>

            <S.ChartRow>
              {dcIds.map((id) => (
                <SingleTelemetryChart key={id} provider={dcProvider} telemetryNames={dcNames}
                  title={id} yAxisLabel="Değer" height={350}
                  labels={chartLabels} locale={loc}
                  tagFilters={[{ tagKey: "deviceId", label: "Cihaz" }]}
                  defaultTagSelections={{ deviceId: [id] }} />
              ))}
            </S.ChartRow>

            <S.UnifiedChartWrap>
              <SingleTelemetryChart provider={dcProvider} telemetryNames={dcNames}
                title="DC Output — Karşılaştırmalı" yAxisLabel="Değer" height={450}
                labels={chartLabels} locale={loc}
                tagFilters={[{ tagKey: "deviceId", label: "Cihaz" }]} />
            </S.UnifiedChartWrap>
          </>
        )}
      </S.PageContainer>
      <RackDetailModal data={detailData} open={detailData !== null} onClose={() => setDetailData(null)} />
      <DeviceDetailModal deviceId={selectedDeviceId} open={selectedDeviceId !== null} onClose={() => setSelectedDeviceId(null)} />
    </>
  );
};

BscPage.displayName = "BscPage";
