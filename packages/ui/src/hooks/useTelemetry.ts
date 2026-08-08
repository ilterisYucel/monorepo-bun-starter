import { useMemo } from "react";
import type { TelemetryEntry } from "./useRealtimeTelemetry";

export interface UseTelemetryOptions {
  historicalData: TelemetryEntry[];
  realtimeData: TelemetryEntry[];
  deviceIds?: string[];
}

export function useTelemetry(options: UseTelemetryOptions) {
  const { historicalData, realtimeData, deviceIds } = options;

  const filteredRealtime = useMemo(() => {
    if (!deviceIds || deviceIds.length === 0) return realtimeData;
    const idSet = new Set(deviceIds);
    return realtimeData.filter((e) => idSet.has(e.deviceId));
  }, [realtimeData, deviceIds]);

  const mergedData = useMemo(() => {
    return [...historicalData, ...filteredRealtime].sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
  }, [historicalData, filteredRealtime]);

  return {
    data: mergedData,
    historicalCount: historicalData.length,
    realtimeCount: filteredRealtime.length,
  };
}
