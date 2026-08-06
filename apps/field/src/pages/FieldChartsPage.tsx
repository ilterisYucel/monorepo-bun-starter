import React from "react";
import { useParams } from "react-router-dom";
import { TelemetryChart } from "@gd-monorepo/ui";
import { useFieldTelemetryProvider } from "../features/field-charts/hooks/useFieldTelemetryProvider";

export const FieldChartsPage: React.FC = () => {
  const { fieldId } = useParams<{ fieldId: string }>();
  const provider = useFieldTelemetryProvider(fieldId ?? "");

  return (
    <div>
      <TelemetryChart
        provider={provider}
        telemetryNames={["SOC", "Power", "Voltage", "Current", "MaxCellTemperature"]}
        title="Konteyner Telemetri"
        yAxisLabel="Deger"
        height={480}
        tagFilters={[
          { tagKey: "container_id", label: "Konteyner" },
        ]}
      />
    </div>
  );
};
