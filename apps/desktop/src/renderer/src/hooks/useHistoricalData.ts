import { useQuery } from "@tanstack/react-query";
import { api } from "../services/api";

export const historicalKeys = {
  all: ["historical"] as const,
  system: () => [...historicalKeys.all, "system"] as const,
};

// Sistem tarihsel verisi
export const useSystemHistorical = (limit: number = 200) => {
  return useQuery({
    queryKey: [...historicalKeys.system(), limit],
    queryFn: () => api.getSystemHistoricalData(limit),
    staleTime: 10000,
    refetchInterval: 10000,
  });
};
