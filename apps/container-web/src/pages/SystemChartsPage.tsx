import React from "react";
import { TelemetryChart } from "@gd-monorepo/ui";
import * as S from "./SystemChartsPage.styles";
import { useSystemTelemetry } from "../features/system-charts/hooks/useSystemTelemetry";
import { useEventAnnotations } from "../hooks/useEventAnnotations";

export const SystemChartsPage: React.FC = () => {
  const telemetryNames = [
    "SOC",
    "SOH",
    "Voltage",
    "Current",
    "ChargePower",
    "Temperature",
  ];
  const telemetryProvider = useSystemTelemetry();
  const eventAnnotations = useEventAnnotations(telemetryProvider.range);

  return (
    <S.SystemChartsPageContainer>
      <TelemetryChart
        provider={telemetryProvider}
        telemetryNames={telemetryNames}
        title="Sistem Olcumleri"
        yAxisLabel="Deger"
        height={500}
        eventAnnotations={eventAnnotations}
      />
    </S.SystemChartsPageContainer>
  );
};
