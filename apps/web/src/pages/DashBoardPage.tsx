// apps/web/src/features/dashboard/DashboardPage.tsx
import React, { useState, useEffect } from "react";
import { BSCGraphic } from "@gd-monorepo/ui";
import { useChargeStatus } from "../hooks/useChargeStatus";
import { useDashboardData } from "../features/dashboard/hooks/useDashboardData";
import { SystemGauges } from "../features/dashboard/components/SystemGauges";
import "./DashboardPage.css";

export const DashboardPage: React.FC = () => {
  const { chargeStatus } = useChargeStatus();
  const { racks, averages, isLoading } = useDashboardData(chargeStatus);

  // İlk 8 rack BSC-01, sonraki 8 rack BSC-02
  const bsc01Racks = racks.slice(0, 8);
  const bsc02Racks = racks.slice(8, 16);

  // DC Output state'leri (gerçek verilerden hesaplanabilir)
  const [bsc01Output, setBsc01Output] = useState({
    status: "online" as const,
    voltage: 398,
    current: 75,
  });
  const [bsc02Output, setBsc02Output] = useState({
    status: "online" as const,
    voltage: 396,
    current: 72,
  });

  // Circuit Breaker state'leri
  const [breaker01Status, setBreaker01Status] = useState<"online" | "offline">(
    "online",
  );
  const [breaker01Position, setBreaker01Position] = useState<"open" | "close">(
    "close",
  );
  const [breaker02Status, setBreaker02Status] = useState<"online" | "offline">(
    "online",
  );
  const [breaker02Position, setBreaker02Position] = useState<"open" | "close">(
    "close",
  );

  // Rack tıklama handler'ı
  const handleRackClick = (rackId: number) => {
    console.log("Rack clicked:", rackId);
    // TODO: Popover veya modal aç
  };

  // Breaker toggle handler'ları
  const handleBreaker01Toggle = (position: "open" | "close") => {
    console.log("Breaker BSC-01 toggled:", position);
    setBreaker01Position(position);
  };

  const handleBreaker02Toggle = (position: "open" | "close") => {
    console.log("Breaker BSC-02 toggled:", position);
    setBreaker02Position(position);
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
      {/* Gauge'ler - Yatay */}
      <SystemGauges averages={averages} />

      {/* BSC Graphics - 2'li grid */}
      <div className="bsc-grid">
        <div className="bsc-card">
          <BSCGraphic
            deviceId="BSC-01"
            racks={bsc01Racks}
            width="100%"
            flowDirection={chargeStatus}
            breakerStatus={breaker01Status}
            breakerPosition={breaker01Position}
            dcOutput={bsc01Output}
            onRackClick={handleRackClick}
            onBreakerToggle={handleBreaker01Toggle}
          />
        </div>
        <div className="bsc-card">
          <BSCGraphic
            deviceId="BSC-02"
            racks={bsc02Racks}
            width="100%"
            flowDirection={chargeStatus}
            breakerStatus={breaker02Status}
            breakerPosition={breaker02Position}
            dcOutput={bsc02Output}
            onRackClick={handleRackClick}
            onBreakerToggle={handleBreaker02Toggle}
          />
        </div>
      </div>
    </div>
  );
};
