import React from "react";
import { useParams } from "react-router-dom";
import { TelemetryChart, useTranslation } from "@gd-monorepo/ui";
import { useFieldTelemetryProvider } from "../features/field-charts/hooks/useFieldTelemetryProvider";

export const FieldChartsPage: React.FC = () => {
  const { t } = useTranslation();
  const { fieldId } = useParams<{ fieldId: string }>();
  const provider = useFieldTelemetryProvider(fieldId ?? "");

  return (
    <div>
      <TelemetryChart
        provider={provider}
        telemetryNames={["SOC", "Power", "Voltage", "Current", "MaxCellTemperature"]}
        title={t("container.telemetryTitle")}
        yAxisLabel={t("chart.yAxisLabel")}
        height={480}
        tagFilters={[
          { tagKey: "container_id", label: t("container.title") },
        ]}
      />
    </div>
  );
};
