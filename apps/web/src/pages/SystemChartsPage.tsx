import React from "react";
import { TelemetryChart } from "@gd-monorepo/ui";
import * as S from "./SystemChartsPage.styles";
import { useTelemetryProvider } from "../hooks/useTelemetryProvider";
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
  const telemetryProvider = useTelemetryProvider({
    telemetryNames,
    defaultRange: "1h",
    defaultPoints: 200,
    filters: { rack_id: "system" },
  });
  const eventAnnotations = useEventAnnotations(telemetryProvider.range);

  return (
    <S.SystemChartsPageContainer>
      <TelemetryChart
        provider={telemetryProvider}
        telemetryNames={telemetryNames}
        title="Sistem Ölçümleri"
        yAxisLabel="Değer"
        height={500}
        eventAnnotations={eventAnnotations}
      />
    </S.SystemChartsPageContainer>
  );
};
