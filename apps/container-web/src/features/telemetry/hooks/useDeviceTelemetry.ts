// apps/container-web/src/features/telemetry/hooks/useDeviceTelemetry.ts
//
// Component-kapsamlı telemetri: her bileşen kendi deviceIds/names kapsamıyla
// çağırır. REST (ilk boya + keep-alive poll, keepPreviousData) + multipleks WS
// canlı kuyruk + en-yeni-kazanır dedup. Sayfa-seviyesi küresel birleştirme YOK.

import { useMemo } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { useTelemetryStream } from "@gd-monorepo/ui";
import type { TelemetryData } from "@gd-monorepo/shared-types";
import { apiClient } from "../../../lib/api-client";
import { useTransport } from "../../../contexts/TransportContext";
import { dedupeLatest } from "../utils/dedupeLatest";

interface LatestResponse {
  telemetries: TelemetryData[];
}

export interface UseDeviceTelemetryOptions {
  deviceIds: readonly string[];
  /** Opsiyonel telemetri adı filtresi (payload küçültür). */
  names?: readonly string[];
  intervalMs?: number;
  enabled?: boolean;
  /** `/telemetry/latest` başına cihaz için son kaç satır (default 2000). */
  limit?: number;
}

export interface UseDeviceTelemetryResult {
  telemetries: TelemetryData[];
  isLoading: boolean;
  isConnected: boolean;
}

export function useDeviceTelemetry(
  options: UseDeviceTelemetryOptions,
): UseDeviceTelemetryResult {
  const { deviceIds, names, intervalMs = 5000, enabled = true, limit } = options;
  const idsKey = useMemo(() => [...deviceIds].sort().join(","), [deviceIds]);
  const namesKey = useMemo(() => (names ? [...names].sort().join(",") : ""), [names]);
  const ids = useMemo(() => (idsKey.length > 0 ? idsKey.split(",") : []), [idsKey]);
  const active = enabled && ids.length > 0;

  const transport = useTransport("ws");
  const { data: realtime, isConnected } = useTelemetryStream({
    transport,
    deviceIds: ids,
    enabled: active,
    ...(names !== undefined ? { names } : {}),
  });

  const { data: historical = [], isLoading } = useQuery({
    queryKey: ["telemetry-latest", idsKey, namesKey, limit ?? 2000],
    queryFn: async ({ signal }) => {
      const params = new URLSearchParams();
      if (idsKey.length > 0) params.set("deviceIds", idsKey);
      if (namesKey.length > 0) params.set("names", namesKey);
      if (limit !== undefined) params.set("limit", String(limit));
      const response = await apiClient.get<LatestResponse>(
        `/unified/telemetry/latest?${params.toString()}`,
        { signal },
      );
      return response.data.telemetries ?? [];
    },
    enabled: active,
    refetchInterval: intervalMs,
    placeholderData: keepPreviousData,
  });

  const telemetries = useMemo(
    () => dedupeLatest([...historical, ...(realtime as unknown as TelemetryData[])]),
    [historical, realtime],
  );

  return { telemetries, isLoading, isConnected };
}
