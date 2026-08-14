import React, { useMemo } from "react";
import {
  DeviceGauges,
  LogTerminal,
  SCADA_ICONS,
  useTranslation,
} from "@gd-monorepo/ui";
import type { DeviceGaugeItem } from "@gd-monorepo/ui";
import { useChargeStatus } from "../hooks/useChargeStatus";
import { useDashboardData } from "../features/dashboard/hooks/useDashboardData";
import { useHvacData } from "../features/hvac";
import { useEnergyAnalyzerData } from "../features/energy-analyzer";
import { useFirePanelData } from "../features/fire-panel";
import { useDevicesStore } from "../stores/devicesStore";
import { useRealtimeStream } from "../contexts/RealtimeContext";
import * as S from "./DashboardPage.styles";
import { useFilteredLogProvider } from "../hooks/useFilteredLogProvider";

const WarningIcon = SCADA_ICONS.logWarning;
const BatteryIcon = SCADA_ICONS.battery;
const ShieldIcon = SCADA_ICONS.health;
const PlugIcon = SCADA_ICONS.powerPlug;
const TempIcon = SCADA_ICONS.temperature;
const CB_ICON = SCADA_ICONS.circuitBreaker;
const FireIcon = SCADA_ICONS.fireAlarm;

export const DashboardPageV2: React.FC = () => {
  const { t } = useTranslation();
  const { chargeStatus } = useChargeStatus();
  const { averages, isLoading: bscLoading } = useDashboardData(chargeStatus);
  const { units: hvacUnits } = useHvacData();
  const { summaries: eaSummaries, isLoading: eaLoading } = useEnergyAnalyzerData();
  const { summary: fpSummary, isLoading: fpLoading } = useFirePanelData();
  const devices = useDevicesStore((s) => s.devices);
  const systemLogProvider = useFilteredLogProvider("system");
  const { data: realtimeData } = useRealtimeStream();

  const bscDevices = useMemo(() => devices.filter((d) => d.type === "bsc" || d.id?.startsWith("BSC-")), [devices]);
  const hvacDevices = useMemo(() => devices.filter((d) => d.type === "hvac"), [devices]);
  const cbDevices = useMemo(() => devices.filter((d) => d.type === "cb" || d.id?.startsWith("CB-")), [devices]);
  const dcDevices = useMemo(() => devices.filter((d) => d.type === "dc_output" || d.id?.startsWith("DC-")), [devices]);

  const bscGaugeBlocks = useMemo(() => bscDevices.map((d) => ({
    id: d.id,
    gauges: [
      { value: averages.avgSoc, label: "SoC", unit: "%", min: 0, max: 100, icon: <BatteryIcon size={16} /> },
      { value: averages.avgSoh, label: "SoH", unit: "%", min: 0, max: 100, icon: <ShieldIcon size={16} /> },
      { value: Math.abs(averages.avgPower), label: t("device.power"), unit: "kW", min: 0, max: 500, icon: <PlugIcon size={16} /> },
      { value: averages.avgVoltage, label: t("device.voltage"), unit: "V", min: 0, max: 5000, icon: <BatteryIcon size={16} /> },
    ] as DeviceGaugeItem[],
  })), [bscDevices, averages, t]);

  const hvacGaugeBlocks = useMemo(() => hvacDevices.map((_d, idx) => {
    const u = hvacUnits[idx];
    return {
      id: _d.id,
      gauges: u ? [
        { value: u.currentTemp ?? 0, label: "Sicaklik", unit: "°C", min: 0, max: 50, icon: <TempIcon size={16} /> },
        { value: u.returnHumidity ?? 0, label: "Nem", unit: "%", min: 0, max: 100, icon: <TempIcon size={16} /> },
        { value: u.status === "running" ? 1 : 0, label: "Calisiyor", unit: "", min: 0, max: 1, icon: <PlugIcon size={16} /> },
        { value: Object.values(u.alarms).filter(Boolean).length, label: "Alarm", unit: "", min: 0, max: 10, icon: <WarningIcon size={16} /> },
      ] as DeviceGaugeItem[] : [] as DeviceGaugeItem[],
    };
  }), [hvacDevices, hvacUnits]);

  const findVal = (deviceId: string, name: string): number => {
    const t = realtimeData.find((x: any) => x.deviceId === deviceId && x.name === name);
    return (t?.value === 1 || t?.value === true) ? 1 : 0;
  };

  const findNum = (deviceId: string, name: string): number => {
    const t = realtimeData.find((x: any) => x.deviceId === deviceId && x.name === name);
    return (t?.value as number) ?? 0;
  };

  const cbGaugeBlock = useMemo(() => ({
    id: "CB-1, CB-2",
    gauges: cbDevices.length >= 2 ? [
      { value: findVal(cbDevices[0]!.id, "Is Closed"), label: "CB1 Kapali", unit: "", min: 0, max: 1, icon: <CB_ICON size={16} /> },
      { value: findVal(cbDevices[0]!.id, "Is Tripped"), label: "CB1 Atmis", unit: "", min: 0, max: 1, icon: <WarningIcon size={16} /> },
      { value: findVal(cbDevices[1]!.id, "Is Closed"), label: "CB2 Kapali", unit: "", min: 0, max: 1, icon: <CB_ICON size={16} /> },
      { value: findVal(cbDevices[1]!.id, "Is Tripped"), label: "CB2 Atmis", unit: "", min: 0, max: 1, icon: <WarningIcon size={16} /> },
    ] as DeviceGaugeItem[] : [] as DeviceGaugeItem[],
  }), [cbDevices, realtimeData]);

  const dcGaugeBlock = useMemo(() => ({
    id: "DC-1, DC-2",
    gauges: dcDevices.length >= 2 ? [
      { value: findNum(dcDevices[0]!.id, "Actual Voltage"), label: "DC1 Voltaj", unit: "V", min: 0, max: 5000, icon: <BatteryIcon size={16} /> },
      { value: findNum(dcDevices[0]!.id, "Actual Current"), label: "DC1 Akim", unit: "A", min: 0, max: 200, icon: <BatteryIcon size={16} /> },
      { value: findNum(dcDevices[1]!.id, "Actual Voltage"), label: "DC2 Voltaj", unit: "V", min: 0, max: 5000, icon: <BatteryIcon size={16} /> },
      { value: findNum(dcDevices[1]!.id, "Actual Current"), label: "DC2 Akim", unit: "A", min: 0, max: 200, icon: <BatteryIcon size={16} /> },
    ] as DeviceGaugeItem[] : [] as DeviceGaugeItem[],
  }), [dcDevices, realtimeData]);

  const eaGaugeBlock = useMemo(() => {
    if (eaSummaries.length === 0) return null;
    const s = eaSummaries[0]!;
    return {
      id: s.deviceId,
      gauges: [
        { value: s.phaseA?.voltageLN ?? 0, label: t("device.voltage"), unit: "V", min: 0, max: 500, icon: <BatteryIcon size={16} /> },
        { value: s.phaseA?.current ?? 0, label: t("device.current"), unit: "A", min: 0, max: 200, icon: <BatteryIcon size={16} /> },
        { value: s.phaseA?.activePower ?? 0, label: t("device.power"), unit: "kW", min: 0, max: 500, icon: <PlugIcon size={16} /> },
        { value: s.activeEnergyDelivered ?? 0, label: "Enerji", unit: "kWh", min: 0, max: 10000, icon: <PlugIcon size={16} /> },
      ] as DeviceGaugeItem[],
    };
  }, [eaSummaries, t]);

  const fpGaugeBlock = useMemo(() => ({
    id: "EP203",
    gauges: [
      { value: fpSummary.fire ? 1 : 0, label: "Yangin", unit: "", min: 0, max: 1, icon: <FireIcon size={16} /> },
      { value: fpSummary.fault ? 1 : 0, label: "Ariza", unit: "", min: 0, max: 1, icon: <WarningIcon size={16} /> },
      { value: fpSummary.firstStageAlarm ? 1 : 0, label: "1.Kademe", unit: "", min: 0, max: 1, icon: <WarningIcon size={16} /> },
      { value: fpSummary.discharged ? 1 : 0, label: "Desarj", unit: "", min: 0, max: 1, icon: <WarningIcon size={16} /> },
    ] as DeviceGaugeItem[],
  }), [fpSummary]);

  const allBlocks = useMemo(() => [
    ...bscGaugeBlocks,
    ...hvacGaugeBlocks,
    ...(cbGaugeBlock.gauges.length > 0 ? [cbGaugeBlock] : []),
    ...(dcGaugeBlock.gauges.length > 0 ? [dcGaugeBlock] : []),
    ...(eaGaugeBlock ? [eaGaugeBlock] : []),
    fpGaugeBlock,
  ], [bscGaugeBlocks, hvacGaugeBlocks, cbGaugeBlock, dcGaugeBlock, eaGaugeBlock, fpGaugeBlock]);

  const isLoading = bscLoading || eaLoading || fpLoading;

  if (isLoading) {
    return (
      <S.LoadingContainer>
        <S.Spinner />
        <p>{t("common.loading")}</p>
      </S.LoadingContainer>
    );
  }

  return (
    <S.DashboardPageContainer>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
        {allBlocks.map((block) => (
          <div key={block.id} style={{ flex: "0 0 calc(50% - 8px)", minWidth: 0 }}>
            <DeviceGauges
              deviceId={block.id}
              gauges={block.gauges}
              variant="circular"
              width="100%"
            />
          </div>
        ))}
      </div>
      <S.TerminalCard>
        <LogTerminal
          provider={systemLogProvider}
          maxHeight={435}
          title={t("page.systemEvents")}
          titleIcon={<WarningIcon size={18} />}
        />
      </S.TerminalCard>
    </S.DashboardPageContainer>
  );
};

DashboardPageV2.displayName = "DashboardPageV2";
