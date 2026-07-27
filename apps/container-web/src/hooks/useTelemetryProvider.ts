// apps/web/src/hooks/useTelemetryProvider.ts
import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../lib/api-client";
import type { TelemetryData } from "@gd-monorepo/shared-types";
import type {
  TelemetryProviderOptions,
  UseTelemetryProvider,
  TimeRange,
} from "@gd-monorepo/ui";
import { useTelemetry } from "@gd-monorepo/ui";
import { useRealtimeStream } from "../contexts/RealtimeContext";
import { API_BASE_URL } from "../lib/api-client";

interface DownsampledResponse {
  telemetries: TelemetryData[];
}

function rangeToDates(range: TimeRange): { from: string; to: string } {
  const now = Date.now();
  let offsetMs: number;
  switch (range) {
    case "1m": offsetMs = 60 * 1000; break;
    case "1h": offsetMs = 60 * 60 * 1000; break;
    case "1d": offsetMs = 24 * 60 * 60 * 1000; break;
    case "1w": offsetMs = 7 * 24 * 60 * 60 * 1000; break;
    case "1M": offsetMs = 30 * 24 * 60 * 60 * 1000; break;
    case "3M": offsetMs = 90 * 24 * 60 * 60 * 1000; break;
    case "6M": offsetMs = 180 * 24 * 60 * 60 * 1000; break;
    case "1y": offsetMs = 365 * 24 * 60 * 60 * 1000; break;
    default: offsetMs = 60 * 60 * 1000;
  }
  return {
    from: new Date(now - offsetMs).toISOString(),
    to: new Date(now).toISOString(),
  };
}

export const useTelemetryProvider: UseTelemetryProvider = (options: TelemetryProviderOptions) => {
  const [selectedName, setSelectedName] = useState<string>("all");
  const [range, setRange] = useState<TimeRange>(options.defaultRange || "1h");
  const [points, setPoints] = useState<number>(options.defaultPoints || 120);

  const fromToRef = useRef(rangeToDates(range));
  const tickRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    fromToRef.current = rangeToDates(range);

    const isLive = range === "1m" || range === "1h";
    if (isLive) {
      tickRef.current = setInterval(() => {
        fromToRef.current = rangeToDates(range);
      }, range === "1m" ? 1000 : 5000);
      return () => clearInterval(tickRef.current);
    }
  }, [range]);

  const { data: httpData = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ["telemetry", "downsampled", range, points, selectedName, options.filters],
    queryFn: async ({ signal }) => {
      const { from, to } = fromToRef.current;
      const params = new URLSearchParams();
      params.append("from", from);
      params.append("to", to);
      params.append("points", points.toString());

      if (selectedName !== "all") {
        params.append("names", selectedName);
      } else if (options.telemetryNames?.length) {
        params.append("names", options.telemetryNames.join(","));
      }

      if (options.filters) {
        for (const [key, value] of Object.entries(options.filters)) {
          params.append(key, String(value));
        }
      }

      if (options.deviceIds?.length) {
        params.append("deviceIds", options.deviceIds.join(","));
      }

      const response = await apiClient.get<DownsampledResponse>(
        `/unified/telemetry/downsampled?${params.toString()}`,
        { signal },
      );

      return response.data.telemetries || [];
    },
    staleTime: 30000,
    refetchInterval: range === "1m" ? 2000 : range === "1h" ? 10000 : 60000,
  });

  const { data: wsData, error: _wsError, reconnect: _reconnect } = useRealtimeStream();

  const { data: mergedData } = useTelemetry({
    historicalData: httpData,
    realtimeData: wsData,
  });

  return {
    data: mergedData,
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