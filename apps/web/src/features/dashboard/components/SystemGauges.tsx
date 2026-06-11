// apps/web/src/features/dashboard/components/SystemGauges.tsx
import React from "react";
import { Gauge } from "@gd-monorepo/ui";
import type { Averages } from "../hooks/useDashboardData";
import "./SystemGauges.css";

interface SystemGaugesProps {
  averages: Averages;
}

export const SystemGauges: React.FC<SystemGaugesProps> = ({ averages }) => {
  return (
    <div className="gauges-row">
      <Gauge
        value={averages.avgSoC}
        label="Ortalama SoC"
        unit="%"
        color="#10b981"
        icon="🔋"
      />
      <Gauge
        value={averages.avgSoH}
        label="Ortalama SoH"
        unit="%"
        color="#8b5cf6"
        icon="💪"
      />
      <Gauge
        value={averages.avgPower}
        max={500}
        label="Sistem Gücü"
        unit="kW"
        color="#f59e0b"
        icon="⚡"
      />
      <Gauge
        value={averages.avgVoltage}
        max={2000}
        label="Sistem Voltajı"
        unit="V"
        color="#3b82f6"
        icon="🔌"
      />
      <Gauge
        value={averages.avgCurrent}
        max={500}
        label="Sistem Akımı"
        unit="A"
        color="#ef4444"
        icon="🌊"
      />
    </div>
  );
};
