// apps/web/src/features/racks/hooks/useRacksData.ts
import { useQuery } from "@tanstack/react-query";
import { racksApi } from "../services/racksApi";
import { telemetriesToRacks } from "../utils/rackHelpers";

export const RACKS_QUERY_KEY = ["racks"];

export const useRacksData = (chargeStatus: "Charge" | "Discharge" | "Idle") => {
  const { data: telemetries = [], isLoading, refetch } = useQuery({
    queryKey: RACKS_QUERY_KEY,
    queryFn: racksApi.getLatest,
    refetchInterval: 5000,
  });

  const racks = telemetriesToRacks(telemetries, chargeStatus);

  return { racks, isLoading, refetch };
};