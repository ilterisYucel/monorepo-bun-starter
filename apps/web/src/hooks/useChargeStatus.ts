// apps/web/src/hooks/useChargeStatus.ts
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { apiClient } from "../lib/api-client";
import { useDevicesStore } from "../stores/devicesStore";
import { useRealtimeStream } from "../contexts/RealtimeContext";
import type { TelemetryData } from "@gd-monorepo/shared-types";

interface LatestResponse {
  telemetries: TelemetryData[];
}

export const CHARGE_STATUS_QUERY_KEY = ["chargeStatus"];

function valueToChargeStatus(value: unknown): ChargeStatus {
  if (value === 1) return "Charge";
  if (value === 2) return "Discharge";
  return "Idle";
}

export const useChargeStatus = (): { chargeStatus: ChargeStatus; isLoading: boolean } => {
  const devices = useDevicesStore((s) => s.devices);
  const bscIds = useMemo(
    () => devices.filter((d) => d.type === "bsc" || d.type === "xrack").map((d) => d.id),
    [devices],
  );

  const { data: httpStatus = "Idle" as ChargeStatus, isLoading } = useQuery<ChargeStatus>({
    queryKey: [...CHARGE_STATUS_QUERY_KEY, bscIds],
    queryFn: async ({ signal }) => {
      const response = await apiClient.get<LatestResponse>(
        `/unified/telemetry/latest?deviceIds=${bscIds.join(",")}`,
        { signal },
      );
      const entry = response.data.telemetries.find((t) => t.name === "ChargeStatus");
      return valueToChargeStatus(entry?.value);
    },
    refetchInterval: 5000,
  });

  const { data: wsData } = useRealtimeStream();

  const chargeStatus = useMemo((): ChargeStatus => {
    const wsEntries = wsData.filter((t) => t.name === "ChargeStatus");
    if (wsEntries.length > 0) {
      const statuses = new Set(wsEntries.map((t) => valueToChargeStatus(t.value)));
      if (statuses.size === 1) return [...statuses][0]!;
      if (statuses.has("Charge")) return "Charge";
      if (statuses.has("Discharge")) return "Discharge";
      return "Idle";
    }
    return httpStatus;
  }, [wsData, httpStatus]);

  return { chargeStatus, isLoading };
};
