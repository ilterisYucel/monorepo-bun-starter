// apps/web/src/hooks/useChargeStatus.ts
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { apiClient } from "../lib/api-client";
import { useDevicesStore } from "../stores/devicesStore";
import type { TelemetryData } from "@gd-monorepo/shared-types";

interface LatestResponse {
  telemetries: TelemetryData[];
}

export const CHARGE_STATUS_QUERY_KEY = ["chargeStatus"];

export const useChargeStatus = () => {
  const devices = useDevicesStore((s) => s.devices);
  const bscIds = useMemo(
    () => devices.filter((d) => d.type === "bsc" || d.type === "xrack").map((d) => d.id),
    [devices],
  );

  const { data: chargeStatus = "Idle", isLoading } = useQuery({
    queryKey: [...CHARGE_STATUS_QUERY_KEY, bscIds],
    queryFn: async () => {
      const response = await apiClient.get<LatestResponse>(
        `/unified/telemetry/latest?deviceIds=${bscIds.join(",")}`,
      );
      const chargeStatusTelemetry = response.data.telemetries.find(
        (t) => t.name === "ChargeStatus" && t.tags?.rack_id === "system",
      );
      const value = chargeStatusTelemetry?.value;
      if (value === 1) return "Charge";
      if (value === 2) return "Discharge";
      return "Idle";
    },
    refetchInterval: 2000,
  });

  return { chargeStatus, isLoading };
};