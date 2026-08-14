import React, { useMemo } from "react";
import {
  BESSDiagram,
  useTranslation,
} from "@gd-monorepo/ui";
import type { BSCUnitWithSummary, EnergyAnalyzerData, FirePanelData } from "@gd-monorepo/ui";
import { useChargeStatus } from "../hooks/useChargeStatus";
import { useDashboardData } from "../features/dashboard/hooks/useDashboardData";
import { useHvacData } from "../features/hvac";
import { hvacUnitsToTmsProps } from "../features/hvac";
import { useEnergyAnalyzerData } from "../features/energy-analyzer";
import { useFirePanelData } from "../features/fire-panel";
import { useDevicesStore } from "../stores/devicesStore";
import { useRealtimeStream } from "../contexts/RealtimeContext";
import * as S from "./DashboardPage.styles";

const DEFAULT_EA: EnergyAnalyzerData = {
  voltage: 400, current: 0, power: 0, energy: 0,
};

const DEFAULT_FP: FirePanelData = {
  fault: false, fire: false, firstStageAlarm: false,
  secondStageAlarm: false, discharged: false, extract: false,
  modeAuto: true, hold: false, abort: false,
};

export const ScadaDashboardPage: React.FC = () => {
  const { t } = useTranslation();
  const { chargeStatus } = useChargeStatus();
  const { racks, averages, isLoading: bscLoading } = useDashboardData(chargeStatus);
  const { units: hvacUnits } = useHvacData();
  const { summaries: eaSummaries, isLoading: eaLoading } = useEnergyAnalyzerData();
  const { summary: fpSummary, isLoading: fpLoading } = useFirePanelData();
  const devices = useDevicesStore((s) => s.devices);
  const { data: realtimeData } = useRealtimeStream();

  const bscDevices = useMemo(
    () => devices.filter((d) => d.type === "bsc" || d.id?.startsWith("BSC-")),
    [devices],
  );

  const breakerStatuses = useMemo<Array<"online" | "offline">>(
    () =>
      bscDevices.map((_bsc, idx) => {
        const isTripped = realtimeData.find(
          (t) => t.deviceId === `CB-${idx + 1}` && t.name === "Is Tripped",
        );
        if (!isTripped) return "online";
        return isTripped.value === 1 || isTripped.value === true ? "offline" : "online";
      }),
    [bscDevices, realtimeData],
  );

  const breakerPositions = useMemo<Array<"open" | "close">>(
    () =>
      bscDevices.map((_bsc, idx) => {
        const isClosed = realtimeData.find(
          (t) => t.deviceId === `CB-${idx + 1}` && t.name === "Is Closed",
        );
        if (!isClosed) return "close";
        return isClosed.value === 1 || isClosed.value === true ? "close" : "open";
      }),
    [bscDevices, realtimeData],
  );

  const dcOutputs = useMemo(
    () =>
      bscDevices.map((_bsc, idx) => {
        const dcEntries = realtimeData.filter((t) => t.deviceId === `DC-${idx + 1}`);
        const isOn = dcEntries.find((t) => t.name === "Is On");
        const voltage = dcEntries.find((t) => t.name === "Actual Voltage");
        const current = dcEntries.find((t) => t.name === "Actual Current");
        if (!isOn) return { status: "online" as const, voltage: 0, current: 0 };
        return {
          status: (isOn.value === 1 || isOn.value === true
            ? ("online" as const)
            : ("offline" as const)),
          voltage: (voltage?.value as number) ?? 0,
          current: (current?.value as number) ?? 0,
        };
      }),
    [bscDevices, realtimeData],
  );

  const tmsProps = useMemo(
    () => (hvacUnits.length > 0 ? hvacUnitsToTmsProps(hvacUnits) : null),
    [hvacUnits],
  );

  const bscUnits: BSCUnitWithSummary[] = useMemo(() => {
    const offsets = bscDevices.reduce<number[]>((acc, d, i) => {
      acc.push(i === 0 ? 0 : acc[i - 1]! + (bscDevices[i - 1]!.rack_count ?? 8));
      return acc;
    }, []);
    return bscDevices.map((device, idx) => {
      const rackCount = device.rack_count ?? 8;
      const bscRacks = racks.slice(offsets[idx]!, offsets[idx]! + rackCount);
      const onlineCount = bscRacks.filter((r) => r.status === "online").length;
      return {
        deviceId: device.id,
        racks: bscRacks,
        breakerStatus: breakerStatuses[idx] ?? "online",
        breakerPosition: breakerPositions[idx] ?? "close",
        dcOutput: dcOutputs[idx] ?? { status: "online" as const, voltage: 398, current: 75 },
        systemSummary: {
          avgSoC: averages.avgSoC,
          avgSoH: averages.avgSoH,
          avgVoltage: averages.avgVoltage,
          avgCurrent: averages.avgCurrent,
          avgPower: averages.avgPower,
          onlineRackCount: onlineCount,
          totalRackCount: rackCount,
        },
      };
    });
  }, [bscDevices, racks, breakerStatuses, breakerPositions, dcOutputs, averages]);

  const eaData: EnergyAnalyzerData = useMemo(() => {
    if (eaSummaries.length === 0) return DEFAULT_EA;
    const s = eaSummaries[0]!;
    const avgVoltage = s.phaseA?.voltageLN ?? 400;
    const avgCurrent = s.phaseA?.current ?? 0;
    const totalPower = s.phaseA?.activePower ?? 0;
    return {
      voltage: avgVoltage,
      current: avgCurrent,
      power: totalPower,
      energy: s.activeEnergyDelivered ?? 0,
    };
  }, [eaSummaries]);

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
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <BESSDiagram
        bscUnits={bscUnits}
        flowDirection={chargeStatus}
        hvacRooms={tmsProps?.rooms ?? []}
        panelTemp={tmsProps?.panel_temp ?? 25}
        panelHumidity={tmsProps?.panel_humidity}
        energyAnalyzer={eaData}
        firePanel={fpSummary}
        width="100%"
        height={1200}
      />
    </div>
  );
};

ScadaDashboardPage.displayName = "ScadaDashboardPage";
