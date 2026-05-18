// src/modules/telemetry/hooks/useChargeStatus.ts
import { useQuery } from "@tanstack/react-query";
import { telemetryService } from "../services/telemetryService";

export const CHARGE_STATUS_QUERY_KEY = ["chargeStatus"];

export const useChargeStatus = () => {
  const { data: chargeStatus = "Idle", isLoading } = useQuery({
    queryKey: CHARGE_STATUS_QUERY_KEY,
    queryFn: telemetryService.getChargeStatus,
    refetchInterval: 1000, // 🔥 Her 1 saniyede bir yenile!
  });

  return { chargeStatus, isLoading };
};
