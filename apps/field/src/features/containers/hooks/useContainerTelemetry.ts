import { useMemo } from "react";
import type { TelemetryData } from "@gd-monorepo/shared-types";
import { mockContainer, mockTimeSeries } from "../services/mockDataGenerator";

export function useContainerTelemetry(containerId: string) {
  const container = useMemo(() => mockContainer(containerId), [containerId]);

  const timeSeries = useMemo(() => mockTimeSeries(containerId), [containerId]);

  const latest = useMemo(
    () => container?.latestTelemetry ?? [],
    [container],
  );

  return { container, latest, timeSeries, isLoading: false };
}
