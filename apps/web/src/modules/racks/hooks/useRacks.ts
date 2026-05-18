// src/modules/racks/hooks/useRacks.ts
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { racksService } from "../services/racksService";
import {
  telemetriesToRacks,
  calculateSystemAverages,
} from "../utils/rackHelpers";
import type { Rack } from "../types";
import type { TelemetryData } from "@gd-monorepo/shared-types";

export const RACKS_QUERY_KEY = ["racks"];

interface UseRacksReturn {
  racks: Rack[];
  telemetries: TelemetryData[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
  averages: {
    avgSoC: number;
    avgSoH: number;
    avgVoltage: number;
    avgCurrent: number;
    avgPower: number;
  };
}

export const useRacks = (
  globalChargeStatus: "Charge" | "Discharge" | "Idle" = "Idle",
): UseRacksReturn => {
  const queryClient = useQueryClient();

  const {
    data: telemetries = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: RACKS_QUERY_KEY,
    queryFn: racksService.getLatest,
    refetchInterval: 5000, // Her 5 saniyede bir yenile
  });

  const racks = telemetriesToRacks(telemetries, globalChargeStatus);
  const averages = calculateSystemAverages(racks);

  return {
    racks,
    telemetries,
    isLoading,
    isError,
    error: error as Error | null,
    refetch: () => {
      queryClient.invalidateQueries({ queryKey: RACKS_QUERY_KEY });
      refetch();
    },
    averages,
  };
};
