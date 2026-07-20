import React, { useMemo } from "react";
import {
  DeviceGauges,
  BSC,
  TMS,
  LogTerminal,
  SCADA_ICONS,
} from "@gd-monorepo/ui";
import type { RoomData, BSCUnit } from "@gd-monorepo/ui";
import { useChargeStatus } from "../hooks/useChargeStatus";
import { useDashboardData } from "../features/dashboard/hooks/useDashboardData";
import { useHvacData, type HvacUnit } from "../features/hvac";
import { hvacUnitsToTmsProps } from "../features/hvac";
import { useDevicesStore } from "../stores/devicesStore";
import { useRealtimeStream } from "../contexts/RealtimeContext";
import * as S from "./DashboardPage.styles";
import { useFilteredLogProvider } from "../hooks/useFilteredLogProvider";

const BatteryIcon = SCADA_ICONS.batteryCharge;
const ShieldIcon = SCADA_ICONS.health;
const PlugIcon = SCADA_ICONS.powerPlug;
const BoltIcon = SCADA_ICONS.batteryDischarge;
const TempIcon = SCADA_ICONS.temperature;
const WarningIcon = SCADA_ICONS.logWarning;

export const DashboardPage: React.FC = () => {
  const { chargeStatus } = useChargeStatus();
  const { racks, averages, isLoading } = useDashboardData(chargeStatus);
  const { units: hvacUnits, averages: hvacAvg } = useHvacData();
  const devices = useDevicesStore((s) => s.devices);
  const bscDevices = useMemo(
    () => devices.filter((d) => d.type === "bsc" || d.id?.startsWith("BSC-")),
    [devices],
  );

  const systemLogProvider = useFilteredLogProvider("system");
  const { data: realtimeData } = useRealtimeStream();

  const breakerStatuses = useMemo<Array<"online" | "offline">>(
    () =>
      bscDevices.map((_bsc, idx) => {
        const isTripped = realtimeData.find(
          (t) => t.deviceId === `CB-${idx + 1}` && t.name === "Is Tripped",
        );
        if (!isTripped) return "online";
        return isTripped.value === 1 || isTripped.value === true
          ? "offline"
          : "online";
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
        return isClosed.value === 1 || isClosed.value === true
          ? "close"
          : "open";
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
          status:
            isOn.value === 1 || isOn.value === true
              ? ("online" as const)
              : ("offline" as const),
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

  const gauges = [
    {
      value: averages.avgSoC,
      label: "SoC",
      unit: "%",
      min: 0,
      max: 100,
      icon: <BatteryIcon size={18} />,
    },
    {
      value: averages.avgSoH,
      label: "SoH",
      unit: "%",
      min: 0,
      max: 100,
      icon: <ShieldIcon size={18} />,
    },
    {
      value: averages.avgPower,
      label: "Guc",
      unit: "kW",
      min: 0,
      max: 500,
      icon: <PlugIcon size={18} />,
    },
    {
      value: averages.avgVoltage,
      label: "Voltaj",
      unit: "V",
      min: 0,
      max: 5000,
      icon: <BatteryIcon size={18} />,
    },
    {
      value: averages.avgCurrent,
      label: "Akim",
      unit: "A",
      min: 0,
      max: 200,
      icon: <BoltIcon size={18} />,
    },
  ];

  const tmsGauges = useMemo(() => {
    const roomMap = new Map<string, HvacUnit[]>();
    for (const u of hvacUnits) {
      const list = roomMap.get(u.room) ?? [];
      list.push(u);
      roomMap.set(u.room, list);
    }
    const gauges = Array.from(roomMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([room, units]) => {
        const temps = units
          .filter((u) => u.currentTemp !== null)
          .map((u) => u.currentTemp as number);
        const avg =
          temps.length > 0
            ? Math.round(
                (temps.reduce((s, t) => s + t, 0) / temps.length) * 10,
              ) / 10
            : 0;
        return {
          value: avg,
          label: room,
          unit: "°C",
          min: 0,
          max: 50,
          icon: <TempIcon size={18} />,
        };
      });
    if (tmsProps) {
      gauges.push({
        value: tmsProps.panel_temp,
        label: "Panel",
        unit: "°C",
        min: 0,
        max: 50,
        icon: <TempIcon size={18} />,
      });
    }
    return gauges;
  }, [hvacUnits, tmsProps]);

  const handleRackClick = (rackId: number) => {
    console.log("Rack clicked:", rackId);
  };

  const bscUnits: BSCUnit[] = useMemo(() => {
    const offsets = bscDevices.reduce<number[]>((acc, d, i) => {
      acc.push(
        i === 0 ? 0 : acc[i - 1]! + (bscDevices[i - 1]!.rack_count ?? 8),
      );
      return acc;
    }, []);

    return bscDevices.map((device, idx) => {
      const rackCount = device.rack_count ?? 8;
      return {
        deviceId: device.id,
        racks: racks.slice(offsets[idx]!, offsets[idx]! + rackCount),
        breakerStatus: breakerStatuses[idx] ?? "online",
        breakerPosition: breakerPositions[idx] ?? "close",
        dcOutput: dcOutputs[idx] ?? {
          status: "online" as const,
          voltage: 398,
          current: 75,
        },
      };
    });
  }, [bscDevices, racks, breakerStatuses, breakerPositions, dcOutputs]);

  if (isLoading) {
    return (
      <S.LoadingContainer>
        <S.Spinner />
        <p>Veriler yukleniyor...</p>
      </S.LoadingContainer>
    );
  }

  return (
    <S.DashboardPageContainer>
      <S.DashboardRow>
        <S.BscColumn>
          <S.DeviceGaugesStack>
            {bscUnits.map((unit) => (
              <DeviceGauges
                key={unit.deviceId}
                deviceId={unit.deviceId}
                gauges={gauges}
                variant="circular"
              />
            ))}
          </S.DeviceGaugesStack>
          <BSC
            deviceId="BSC"
            bscUnits={bscUnits}
            width="100%"
            flowDirection={chargeStatus}
            onRackClick={handleRackClick}
          />
        </S.BscColumn>
        <S.TmsColumn>
          <DeviceGauges deviceId="HVAC" gauges={tmsGauges} variant="circular" />
          {tmsProps && (
            <TMS
              rooms={tmsProps.rooms}
              panel_temp={tmsProps.panel_temp}
              status={tmsProps.status}
              width="100%"
            />
          )}
          <S.TerminalCard>
            <LogTerminal
              provider={systemLogProvider}
              maxHeight={435}
              title="Sistem Event & Hatalari"
              titleIcon={<WarningIcon size={18} />}
            />
          </S.TerminalCard>
        </S.TmsColumn>
      </S.DashboardRow>
    </S.DashboardPageContainer>
  );
};
