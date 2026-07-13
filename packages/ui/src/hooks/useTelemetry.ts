import { useMemo } from "react";
import type { TelemetryEntry } from "./useRealtimeTelemetry";

export interface UseTelemetryOptions {
  historicalData: TelemetryEntry[];
  realtimeData: TelemetryEntry[];
}

export function useTelemetry(options: UseTelemetryOptions) {
  const { historicalData, realtimeData } = options;

  const mergedData = useMemo(() => {
    return [...historicalData, ...realtimeData].sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
  }, [historicalData, realtimeData]);

  return {
    data: mergedData,
    historicalCount: historicalData.length,
    realtimeCount: realtimeData.length,
  };
}
