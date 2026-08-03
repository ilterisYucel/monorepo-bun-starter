import React, { useState, useMemo } from "react";
import { RackCard, BSCCard, TelemetryChart } from "@gd-monorepo/ui";
import { RackDetailModal } from "../features/racks/components/RackDetailModal";
import type { RackDetailData } from "../features/racks/components/RackDetailModal";
import * as S from "./RacksPage.styles";
import { useChargeStatus } from "../hooks/useChargeStatus";
import { useRacksData } from "../features/racks/hooks/useRacksData";
import { telemetriesToBscSummaries } from "../features/racks/utils/bscHelpers";
import { useTelemetryProvider } from "../hooks/useTelemetryProvider";
import { useEventAnnotations } from "../hooks/useEventAnnotations";
import { useDevicesStore } from "../stores/devicesStore";

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
  const { racks, rackDetails, mergedTelemetries, isLoading } = useRacksData(chargeStatus);
  const devices = useDevicesStore((s) => s.devices);
  const bscDevices = useMemo(
    () => devices.filter((d) => d.type === "bsc" || d.type === "xrack"),
    [devices],
  );
  const bscSummaries = useMemo(
    () => telemetriesToBscSummaries(mergedTelemetries, chargeStatus, bscDevices),
    [mergedTelemetries, chargeStatus, bscDevices],
  );
  const bscIds = useMemo(
    () => bscDevices.map((d) => d.id),
    [bscDevices],
  );
  const rackTelemetryProvider = useTelemetryProvider({
    telemetryNames: TELEMETRY_NAMES,
    defaultRange: "1h",
    defaultPoints: 200,
    deviceIds: bscIds,
  });
  const eventAnnotations = useEventAnnotations(rackTelemetryProvider.range);
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
          <S.BSCCardGrid>
            {bscSummaries.map((bsc, i) => (
              <BSCCard key={i} {...bsc} />
            ))}
          </S.BSCCardGrid>
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
            provider={rackTelemetryProvider}
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
