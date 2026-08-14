// apps/web/src/hooks/useTelemetryProvider.ts
import { useState, useRef, useEffect, useCallback } from "react";
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

const MS_PER_MINUTE = 60_000;
const MS_PER_HOUR = 3_600_000;
const MS_PER_DAY = 86_400_000;
const DEFAULT_POINTS = 120;
const LIVE_1M_REFRESH_MS = 2_000;
const LIVE_1H_REFRESH_MS = 10_000;
const STATIC_REFRESH_MS = 60_000;
const LIVE_1M_TICK_MS = 1_000;
const LIVE_1H_TICK_MS = 5_000;

function rangeToDates(range: TimeRange): { from: string; to: string } {
  const now = Date.now();
  let offsetMs: number;
  switch (range) {
    case "1m": offsetMs = MS_PER_MINUTE; break;
    case "1h": offsetMs = MS_PER_HOUR; break;
    case "1d": offsetMs = MS_PER_DAY; break;
    case "1w": offsetMs = 7 * MS_PER_DAY; break;
    case "1M": offsetMs = 30 * MS_PER_DAY; break;
    case "3M": offsetMs = 90 * MS_PER_DAY; break;
    case "6M": offsetMs = 180 * MS_PER_DAY; break;
    case "1y": offsetMs = 365 * MS_PER_DAY; break;
    default: offsetMs = MS_PER_HOUR;
  }
  return {
    from: new Date(now - offsetMs).toISOString(),
    to: new Date(now).toISOString(),
  };
}

export const useTelemetryProvider: UseTelemetryProvider = (options: TelemetryProviderOptions) => {
  const [selectedName, setSelectedName] = useState<string>("all");
  const [range, setRange] = useState<TimeRange>(options.defaultRange || "1h");
  const [points, setPoints] = useState<number>(options.defaultPoints || DEFAULT_POINTS);
  const [customFrom, setCustomFrom] = useState<string>();
  const [customTo, setCustomTo] = useState<string>();

  const fromToRef = useRef(rangeToDates(range));
  const tickRef = useRef<ReturnType<typeof setInterval>>();

  const setCustomRange = useCallback((from: string, to: string) => {
    setCustomFrom(from);
    setCustomTo(to);
    setRange("custom");
  }, []);

  useEffect(() => {
    if (range === "custom") return;
    fromToRef.current = rangeToDates(range);

    const isLive = range === "1m" || range === "1h";
    if (isLive) {
      tickRef.current = setInterval(() => {
        fromToRef.current = rangeToDates(range);
      }, range === "1m" ? LIVE_1M_TICK_MS : LIVE_1H_TICK_MS);
      return () => clearInterval(tickRef.current);
    }
  }, [range]);

  const { data: httpData = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ["telemetry", "downsampled", range, points, selectedName, options.filters, customFrom, customTo],
    queryFn: async ({ signal }) => {
      const from = range === "custom" && customFrom ? customFrom : fromToRef.current.from;
      const to = range === "custom" && customTo ? customTo : fromToRef.current.to;
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
    // Geçici boş yanıtlar (ör. registry.online() anlık boş kalması) grafiği
    // silmesin — yeni veri gelene kadar önceki veri yerinde kalır.
    placeholderData: (previousData) => previousData,
    refetchInterval: range === "1m" ? LIVE_1M_REFRESH_MS : range === "1h" ? LIVE_1H_REFRESH_MS : STATIC_REFRESH_MS,
  });

  const { data: wsData, error: _wsError, reconnect: _reconnect } = useRealtimeStream();

  const { data: mergedData } = useTelemetry({
    historicalData: httpData,
    realtimeData: wsData,
    deviceIds: options.deviceIds,
  });

  return {
    data: mergedData,
    isLoading,
    isError,
    error: error as Error | null,
    selectedName,
    range,
    points,
    customFrom,
    customTo,
    refetch,
    setRange,
    setPoints,
    setSelectedName,
    setCustomRange,
  };
};