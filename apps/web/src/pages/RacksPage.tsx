import React from "react";
import { RackCard, TelemetryChart } from "@gd-monorepo/ui";
import * as S from "./RacksPage.styles";
import { useChargeStatus } from "../hooks/useChargeStatus";
import { useRacksData } from "../features/racks/hooks/useRacksData";
import { useSystemTelemetry } from "../features/system-charts/hooks/useSystemTelemetry";

const TELEMETRY_NAMES = [
  "Voltage",
  "Current",
  "Power",
  "SoC",
  "Temperature",
  "SoH",
];

export const RacksPage: React.FC = () => {
  const { chargeStatus } = useChargeStatus();
  const { racks, isLoading } = useRacksData(chargeStatus);
  const systemTelemetry = useSystemTelemetry();

  if (isLoading) {
    return (
      <S.LoadingContainer>
        <S.Spinner />
        <p>Veriler yükleniyor...</p>
      </S.LoadingContainer>
    );
  }

  return (
    <S.RacksPageContainer>
      <S.RackGrid>
        {racks.map((rack) => (
          <RackCard
            key={rack.id}
            {...rack}
            charge_status={chargeStatus}
            onDetailClick={() => console.log("Detay:", rack.name, rack.id)}
          />
        ))}
      </S.RackGrid>
      <TelemetryChart
        provider={systemTelemetry}
        telemetryNames={TELEMETRY_NAMES}
        title="Tüm Rack'ler - Tarihsel Veriler"
        yAxisLabel="Değer"
        height={550}
        tagFilters={[{ tagKey: "rack_id", label: "Rack Numarası" }]}
      />
    </S.RacksPageContainer>
  );
};
