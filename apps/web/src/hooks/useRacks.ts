// frontend/src/hooks/useRacks.ts

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";

export const racksKeys = {
  all: ["racks"] as const,
  list: () => [...racksKeys.all, "list"] as const,
};

export const useRacks = () => {
  return useQuery({
    queryKey: racksKeys.list(),
    queryFn: () => api.getLatestTelemetries(),
    staleTime: 5000,
    refetchInterval: 5000,
  });
};

export const useSetPower = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      chargeStatus,
      powerKw,
      durationSeconds,
    }: {
      chargeStatus: "Charge" | "Discharge" | "Idle";
      powerKw: number;
      durationSeconds: number;
    }) => api.setPower(chargeStatus, powerKw, durationSeconds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: racksKeys.list() });
    },
  });
};
