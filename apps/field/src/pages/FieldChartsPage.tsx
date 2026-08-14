import React from "react";
import { useParams } from "react-router-dom";
import { TelemetryChart, Tabs, useTranslation } from "@gd-monorepo/ui";
import { useFieldTelemetryProvider } from "../features/field-charts/hooks/useFieldTelemetryProvider";
import { useFieldAggregateProvider } from "../features/field-charts/hooks/useFieldAggregateProvider";

export const FieldChartsPage: React.FC = () => {
  const { t, locale } = useTranslation();
  const loc = locale();
  const { fieldId } = useParams<{ fieldId: string }>();
  const containerProvider = useFieldTelemetryProvider(fieldId ?? "");
  const totalPowerProvider = useFieldAggregateProvider("TotalPower");
  const avgSocProvider = useFieldAggregateProvider("AvgSoc");

  const chartHeight = 480;

  return (
    <div>
      <Tabs
        defaultKey="field-power"
        tabs={[
          {
            key: "field-power",
            label: t("charts.totalPower"),
            content: (
              <TelemetryChart
                provider={totalPowerProvider}
                telemetryNames={["TotalPower"]}
                title={`${t("charts.fieldAggregate")} — ${t("charts.totalPower")}`}
                yAxisLabel="kW"
                height={chartHeight}
                locale={loc}
              />
            ),
          },
          {
            key: "field-soc",
            label: t("charts.avgSocChart"),
            content: (
              <TelemetryChart
                provider={avgSocProvider}
                telemetryNames={["AvgSoc"]}
                title={`${t("charts.fieldAggregate")} — ${t("charts.avgSocChart")}`}
                yAxisLabel="%"
                height={chartHeight}
                locale={loc}
              />
            ),
          },
          {
            key: "per-container",
            label: t("charts.perContainer"),
            content: (
              <TelemetryChart
                provider={containerProvider}
                telemetryNames={["SOC", "Power", "Voltage", "Current", "MaxCellTemperature"]}
                title={t("container.telemetryTitle")}
                yAxisLabel={t("chart.yAxisLabel")}
                height={chartHeight}
                locale={loc}
                tagFilters={[
                  { tagKey: "container_id", label: t("container.title") },
                ]}
              />
            ),
          },
        ]}
      />
    </div>
  );
};
