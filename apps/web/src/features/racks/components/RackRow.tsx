// apps/web/src/features/racks/components/RackRow.tsx
import React from "react";
import { RackCard, TelemetryChart } from "@gd-monorepo/ui";
import { useRackTelemetry } from "../hooks/useRackTelemetry";
import type { Rack } from "../types/rack";
import "./RackRow.css";

interface RackRowProps {
  rack: Rack;
  chargeStatus: "Charge" | "Discharge" | "Idle";
}

export const RackRow: React.FC<RackRowProps> = ({ rack, chargeStatus }) => {
  const telemetryNames = [
    "Voltage",
    "Current",
    "Power",
    "Temperature",
    "SoC",
    "SoH",
  ];
  const telemetryProvider = useRackTelemetry(rack.id);

  return (
    <div className="rack-row">
      <div className="rack-row-card">
        <RackCard {...rack} charge_status={chargeStatus} />
      </div>
      <div className="rack-row-chart">
        <TelemetryChart
          provider={telemetryProvider}
          telemetryNames={telemetryNames}
          title={`${rack.name} - Tarihsel Veriler`}
          yAxisLabel="Değer"
          height={250}
        />
      </div>
    </div>
  );
};
