// frontend/src/hooks/useHistoricalData.ts

import { useQuery } from "@tanstack/react-query";
import { api } from "../services/api";

export const historicalKeys = {
  all: ["historical"] as const,
  list: () => [...historicalKeys.all, "list"] as const,
};

export const useHistoricalTelemetries = (limit: number = 200) => {
  return useQuery({
    queryKey: [...historicalKeys.list(), limit],
    queryFn: () => api.getHistoricalTelemetries(limit),
    staleTime: 10000,
    refetchInterval: 10000,
  });
};
