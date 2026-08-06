import { useState, useMemo, useCallback } from "react";
import type { TelemetryProvider, TimeRange } from "@gd-monorepo/ui";
import { mockAllTimeSeries } from "../../containers/services/mockDataGenerator";

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

export function useFieldTelemetryProvider(
  fieldId: string,
): TelemetryProvider {
  const [points, setPoints] = useState(120);
  const [range, setRange] = useState<TimeRange>("1d");
  const [selectedName, setSelectedName] = useState<string | "all">("all");

  const allContainerIds = useMemo(
    () => ["container-1", "container-2", "container-3"],
    [],
  );

  const data = useMemo(() => {
    const raw = mockAllTimeSeries(allContainerIds, RANGE_MS[range]);

    if (selectedName !== "all") {
      return raw.filter((t) => t.name === selectedName);
    }

    return raw;
  }, [allContainerIds, range, selectedName]);

  const refetch = useCallback(() => {}, []);

  return {
    data,
    isLoading: false,
    isError: false,
    error: null,
    selectedName,
    range,
    points,
    refetch,
    setRange,
    setPoints,
    setSelectedName,
  };
}
