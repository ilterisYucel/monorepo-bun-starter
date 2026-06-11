// apps/web/src/hooks/useChargeStatus.ts
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../lib/api-client";
import type { TelemetryData } from "@gd-monorepo/shared-types";

interface LatestResponse {
  telemetries: TelemetryData[];
}

export const CHARGE_STATUS_QUERY_KEY = ["chargeStatus"];

export const useChargeStatus = () => {
  const { data: chargeStatus = "Idle", isLoading } = useQuery({
    queryKey: CHARGE_STATUS_QUERY_KEY,
    queryFn: async () => {
      const response = await apiClient.get<LatestResponse>("/racks/latest");
      const chargeStatusTelemetry = response.data.telemetries.find(
        (t) => t.name === "ChargeStatus" && (!t.tags || Object.keys(t.tags).length === 0)
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