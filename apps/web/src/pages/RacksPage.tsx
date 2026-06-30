import React, { useState } from "react";
import { RackCard, TelemetryChart } from "@gd-monorepo/ui";
import { RackDetailModal } from "../features/racks/components/RackDetailModal";
import type { RackDetailData } from "../features/racks/components/RackDetailModal";
import * as S from "./RacksPage.styles";
import { useChargeStatus } from "../hooks/useChargeStatus";
import { useRacksData } from "../features/racks/hooks/useRacksData";
import { useSystemTelemetry } from "../features/system-charts/hooks/useSystemTelemetry";
import { useEventAnnotations } from "../hooks/useEventAnnotations";

const TELEMETRY_NAMES = [
  "SOC",
  "SOH",
  "Voltage",
  "Current",
  "ChargePower",
  "Temperature",
];

export const RacksPage: React.FC = () => {
  const { chargeStatus } = useChargeStatus();
  const { racks, rackDetails, isLoading } = useRacksData(chargeStatus);
  const systemTelemetry = useSystemTelemetry();
  const eventAnnotations = useEventAnnotations(systemTelemetry.range);
  const [detailData, setDetailData] = useState<RackDetailData | null>(null);

  return (
    <S.RacksPageContainer>
      {isLoading ? (
        <S.LoadingContainer>
          <S.Spinner />
          <p>Veriler yükleniyor...</p>
        </S.LoadingContainer>
      ) : (
        <>
          <S.RackGrid>
            {racks.map((rack) => (
              <RackCard
                key={`${rack.deviceId}-${rack.id}`}
                {...rack}
                charge_status={chargeStatus}
                onDetailClick={() => {
              const detail = rackDetails.get(`${rack.deviceId}-${rack.id}`);
              if (detail) setDetailData(detail);
            }}
              />
            ))}
          </S.RackGrid>
          <TelemetryChart
            provider={systemTelemetry}
            telemetryNames={TELEMETRY_NAMES}
            title="Tüm Rack'ler - Tarihsel Veriler"
            yAxisLabel="Değer"
            height={550}
            tagFilters={[
              { tagKey: "deviceId", label: "Cihaz" },
              { tagKey: "rack_id", label: "Rack Numarası" },
            ]}
            eventAnnotations={eventAnnotations}
          />
        </>
      )}
      <RackDetailModal
        data={detailData}
        open={detailData !== null}
        onClose={() => setDetailData(null)}
      />
    </S.RacksPageContainer>
  );
};
