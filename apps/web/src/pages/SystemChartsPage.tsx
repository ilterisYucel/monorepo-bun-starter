import React from "react";
import { TelemetryChart } from "@gd-monorepo/ui";
import * as S from "./SystemChartsPage.styles";
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
    <S.SystemChartsPageContainer>
      <TelemetryChart
        provider={telemetryProvider}
        telemetryNames={telemetryNames}
        title="Sistem Ölçümleri"
        yAxisLabel="Değer"
        height={500}
      />
    </S.SystemChartsPageContainer>
  );
};
