// apps/field/src/features/pcs/hooks/usePcsTelemetryProvider.ts
import { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import type { TelemetryProvider, TimeRange } from "@gd-monorepo/ui";
import type { TelemetryData } from "@gd-monorepo/shared-types";
import { containersApi } from "../../containers/services/containersApi";

const RANGE_MS: Record<TimeRange, number> = {
  "1m": 60 * 1000,
  "1h": 60 * 60 * 1000,
  "1d": 24 * 60 * 60 * 1000,
  "1w": 7 * 24 * 60 * 60 * 1000,
  "1M": 30 * 24 * 60 * 60 * 1000,
  "3M": 90 * 24 * 60 * 60 * 1000,
  "6M": 180 * 24 * 60 * 60 * 1000,
  "1y": 365 * 24 * 60 * 60 * 1000,
};

/**
 * 2026-09-02 — PCS sayfası grafik kaynağı (SingleTelemetryChart beslemesi).
 *
 * Konteynerin tarihsel downsampled serisini ister (ContainerProxy →
 * konteyner `telemetry-query`), yanıtı yalnızca `pcsId` satırlarına iner.
 * Varsayılan: 1 saat, 200 nokta. Veri yalnızca konteyner bağlıyken gelir
 * (tünel üzerinden) — kademeli bozulma: boş seri grafikte "veri yok"
 * gösterir.
 */
export function usePcsTelemetryProvider(
  fieldId: string,
  containerId: string,
  pcsId: string,
): TelemetryProvider {
  const [points, setPoints] = useState(200);
  const [range, setRange] = useState<TimeRange>("1h");
  const [selectedName, setSelectedName] = useState<string | "all">("all");

  const seriesQuery = useQuery({
    queryKey: ["pcsSeries", fieldId, containerId, range, points],
    queryFn: async () => {
      const to = new Date();
      const from = new Date(to.getTime() - RANGE_MS[range]);
      return containersApi.timeSeries(
        fieldId,
        containerId,
        points,
        from.toISOString(),
        to.toISOString(),
      );
    },
    enabled: fieldId.length > 0 && containerId.length > 0,
  });

  const data: TelemetryData[] = useMemo(() => {
    const raw = (seriesQuery.data ?? []).filter((t) => t.deviceId === pcsId);
    if (selectedName !== "all") {
      return raw.filter((t) => t.name === selectedName);
    }
    return raw;
  }, [seriesQuery.data, pcsId, selectedName]);

  const refetch = useCallback(() => {
    void seriesQuery.refetch();
  }, [seriesQuery]);

  return {
    data,
    isLoading: seriesQuery.isLoading,
    isError: seriesQuery.isError,
    error: seriesQuery.error ?? null,
    selectedName,
    range,
    points,
    refetch,
    setRange,
    setPoints,
    setSelectedName,
  };
}
