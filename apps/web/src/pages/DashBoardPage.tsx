// apps/web/src/features/dashboard/DashboardPage.tsx
import React, { useState } from "react";
import { BSCStack, TMSGraphic } from "@gd-monorepo/ui";
import type { RoomData } from "@gd-monorepo/ui";
import { useChargeStatus } from "../hooks/useChargeStatus";
import { useDashboardData } from "../features/dashboard/hooks/useDashboardData";
import { SystemGaugesGroup } from "../features/dashboard/components/SystemGaugesGroup";
import "./DashboardPage.css";

export const DashboardPage: React.FC = () => {
  const { chargeStatus } = useChargeStatus();
  const { racks, averages, isLoading } = useDashboardData(chargeStatus);

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

  if (isLoading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner"></div>
        <p>Veriler yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-row">
        <div className="bsc-column">
          <SystemGaugesGroup bscData={[averages, averages]} />
          <BSCStack
            deviceId="BSC"
            bscCount={2}
            racks={racks}
            width="100%"
            flowDirection={chargeStatus}
            breakerStatuses={breakerStatuses}
            breakerPositions={breakerPositions}
            dcOutputs={dcOutputs}
            onRackClick={handleRackClick}
            onBreakerToggle={handleBreakerToggle}
          />
        </div>
        <TMSGraphic
          rooms={tmsData.rooms}
          panel_temp={tmsData.panel_temp}
          status={tmsData.status}
          width="100%"
        />
      </div>
    </div>
  );
};
