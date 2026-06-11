// apps/web/src/hooks/useTelemetryProvider.ts
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../lib/api-client";
import type { TelemetryData } from "@gd-monorepo/shared-types";
import type {
  TelemetryProviderOptions,
  UseTelemetryProvider,
  TimeRange,
} from "@gd-monorepo/ui";

interface DownsampledResponse {
  telemetries: TelemetryData[];
}

export const useTelemetryProvider: UseTelemetryProvider = (options: TelemetryProviderOptions) => {
  const [selectedName, setSelectedName] = useState<string>("all");
  const [range, setRange] = useState<TimeRange>(options.defaultRange || "1h");
  const [points, setPoints] = useState<number>(options.defaultPoints || 120);

  const { data = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ["telemetry", "downsampled", range, points, selectedName, options.filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("range", range);
      params.append("points", points.toString());

      if (selectedName !== "all") {
        params.append("telemetry", selectedName);
      }

      // 🔥 filters varsa backend'e parametre olarak ekle
      if (options.filters) {
        for (const [key, value] of Object.entries(options.filters)) {
          params.append(key, value);
        }
      }

      const response = await apiClient.get<DownsampledResponse>(
        `/racks/history/downsampled?${params.toString()}`
      );

      return response.data.telemetries || [];
    },
    staleTime: 30000,
    refetchInterval: 60000,
  });

  return {
    data,
    isLoading,
    isError,
    error: error as Error | null,
    selectedName,
    range,
    points,
    refetch,
    setRange,
    setPoints,
    setSelectedName,
  };
};