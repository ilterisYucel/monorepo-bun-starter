// src/modules/telemetry/hooks/useHistoricalData.ts
import { useQuery } from "@tanstack/react-query";
import { telemetryService } from "../services/telemetryService";
import {
  extractSystemChartData,
  extractRackChartData,
} from "../utils/chartHelpers";
import type { ChartDataPoint } from "../types";
import type { TelemetryData } from "@gd-monorepo/shared-types";

export const HISTORICAL_QUERY_KEY = ["historical"];

interface UseHistoricalDataReturn {
  historicalTelemetries: TelemetryData[];
  chartData: ChartDataPoint[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
  getRackChartData: (rackId: number) => ChartDataPoint[];
}

export const useHistoricalData = (
  hours: number = 1, // 🔥 hours parametresi (son X saat)
  limit?: number,
): UseHistoricalDataReturn => {
  const {
    data: historicalTelemetries = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: [...HISTORICAL_QUERY_KEY, hours, limit],
    queryFn: () => telemetryService.getHistoricalData(hours, limit),
    refetchInterval: 60000, // 1 dakikada bir yenile (1 saatlik veri için yeterli)
  });

  // 🔥 Tüm rack'lerin ortalamasını alan chartData
  const chartData = extractSystemChartData(historicalTelemetries);

  const getRackChartData = (rackId: number): ChartDataPoint[] => {
    return extractRackChartData(historicalTelemetries, rackId);
  };

  return {
    historicalTelemetries,
    chartData,
    isLoading,
    isError,
    error: error as Error | null,
    refetch,
    getRackChartData,
  };
};
