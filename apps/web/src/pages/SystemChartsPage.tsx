// apps/web/src/features/system-charts/SystemChartsPage.tsx
import React from "react";
import { TelemetryChart } from "@gd-monorepo/ui";
import "./SystemChartsPage.css";
import { useSystemTelemetry } from "../features/system-charts/hooks/useSystemTelemetry";

export const SystemChartsPage: React.FC = () => {
  const telemetryNames = [
    "Voltage",
    "Current",
    "Power",
    "SoC",
    "Temperature",
    "SoH",
  ];
  const telemetryProvider = useSystemTelemetry();

  return (
    <div className="system-charts-page">
      <div className="system-chart-container">
        <TelemetryChart
          provider={telemetryProvider}
          telemetryNames={telemetryNames}
          title="Sistem Ölçümleri"
          yAxisLabel="Değer"
          height={500}
        />
      </div>
    </div>
  );
};
