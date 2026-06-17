import React, { useState } from "react";
import {
  BSCGraphic,
  TMSGraphic,
  DeviceGauges,
  LogTerminal,
  SCADA_ICONS,
} from "@gd-monorepo/ui";
import type { RoomData, BSCUnit } from "@gd-monorepo/ui";
import { useChargeStatus } from "../hooks/useChargeStatus";
import { useDashboardData } from "../features/dashboard/hooks/useDashboardData";
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

  const systemLogProvider = useFilteredLogProvider("system");

  const [dcOutputs] = useState([
    { status: "online" as const, voltage: 398, current: 75 },
    { status: "online" as const, voltage: 396, current: 72 },
  ]);

  const [breakerStatuses] = useState<Array<"online" | "offline">>([
    "online",
    "online",
  ]);

  const [breakerPositions, setBreakerPositions] = useState<
    Array<"open" | "close">
  >(["open", "close"]);

  const [tmsData] = useState<{
    rooms: RoomData[];
    panel_temp: number;
    status: string;
  }>({
    rooms: [
      {
        temp: 22.5,
        hvacs: [
          { status: "online", mode: "cooling" },
          { status: "online", mode: "cooling" },
        ],
      },
      {
        temp: 28.1,
        hvacs: [
          { status: "online", mode: "warming" },
          { status: "online", mode: "warming" },
        ],
      },
      {
        temp: 19.0,
        hvacs: [
          { status: "offline", mode: "idle" },
          { status: "online", mode: "cooling" },
        ],
      },
      {
        temp: 24.3,
        hvacs: [
          { status: "online", mode: "cooling" },
          { status: "online", mode: "warming" },
        ],
      },
    ],
    panel_temp: 21.0,
    status: "online",
  });

  const gauges = [
    { value: averages.avgSoC, label: "SoC", unit: "%", icon: <BatteryIcon size={18} /> },
    { value: averages.avgSoH, label: "SoH", unit: "%", icon: <ShieldIcon size={18} /> },
    { value: averages.avgPower, label: "Güç", unit: "kW", icon: <PlugIcon size={18} /> },
    { value: averages.avgVoltage, label: "Voltaj", unit: "V", icon: <BatteryIcon size={18} /> },
    { value: averages.avgCurrent, label: "Akım", unit: "A", icon: <BoltIcon size={18} /> },
  ];

  const tmsGauges = tmsData.rooms.map((room, i) => ({
    value: room.temp,
    label: `Oda ${i + 1}`,
    unit: "°C",
    icon: <TempIcon size={18} />,
  }));
  tmsGauges.push({
    value: tmsData.panel_temp,
    label: "Panel",
    unit: "°C",
    icon: <TempIcon size={18} />,
  });

  const handleRackClick = (rackId: number) => {
    console.log("Rack clicked:", rackId);
  };

  const handleBreakerToggle = (
    bscIndex: number,
    position: "open" | "close",
  ) => {
    console.log(`Breaker BSC-${bscIndex + 1} toggled:`, position);
    setBreakerPositions((prev) => {
      const next = [...prev];
      next[bscIndex] = position;
      return next;
    });
  };

  const bscUnits: BSCUnit[] = [
    {
      deviceId: "BSC-1",
      racks: racks.slice(0, 8),
      breakerStatus: breakerStatuses[0],
      breakerPosition: breakerPositions[0],
      dcOutput: dcOutputs[0],
    },
    {
      deviceId: "BSC-2",
      racks: racks.slice(8, 16),
      breakerStatus: breakerStatuses[1],
      breakerPosition: breakerPositions[1],
      dcOutput: dcOutputs[1],
    },
  ];

  if (isLoading) {
    return (
      <S.LoadingContainer>
        <S.Spinner />
        <p>Veriler yükleniyor...</p>
      </S.LoadingContainer>
    );
  }

  return (
    <S.DashboardPageContainer>
      <S.DashboardRow>
        <S.BscColumn>
          <S.DeviceGaugesStack>
            <DeviceGauges deviceId="BSC-1" gauges={gauges} variant="linear" />
            <DeviceGauges deviceId="BSC-2" gauges={gauges} variant="linear" />
          </S.DeviceGaugesStack>
          <BSCGraphic
            deviceId="BSC"
            bscUnits={bscUnits}
            width="100%"
            flowDirection={chargeStatus}
            onRackClick={handleRackClick}
            onBreakerToggle={handleBreakerToggle}
          />
        </S.BscColumn>
        <S.TmsColumn>
          <DeviceGauges deviceId="TMS" gauges={tmsGauges} variant="linear" />
          <TMSGraphic
            rooms={tmsData.rooms}
            panel_temp={tmsData.panel_temp}
            status={tmsData.status}
            width="100%"
          />
          <S.TerminalCard>
            <LogTerminal
              provider={systemLogProvider}
              maxHeight={435}
              title="Sistem Event & Hataları"
              titleIcon={<WarningIcon size={18} />}
            />
          </S.TerminalCard>
        </S.TmsColumn>
      </S.DashboardRow>
    </S.DashboardPageContainer>
  );
};