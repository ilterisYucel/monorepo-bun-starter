import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTelemetry } from "@gd-monorepo/ui";
import type { TelemetryData } from "@gd-monorepo/shared-types";
import { useRealtimeStream } from "../../../contexts/RealtimeContext";
import { useDevicesStore } from "../../../stores/devicesStore";
import { energyAnalyzerApi } from "../services/energyAnalyzerApi";
import { telemetriesToSummary } from "../utils/energyAnalyzerHelpers";
import type { EnergyAnalyzerSummary } from "../types/energy-analyzer";

export const ENERGY_ANALYZER_QUERY_KEY = ["energy-analyzer"];

export const useEnergyAnalyzerData = () => {
  const devices = useDevicesStore((s) => s.devices);
  const pmDevices = useMemo(
    () => devices.filter((d) => d.type === "energy-analyzer" || d.id.startsWith("PM5340") || d.id.startsWith("PM5320")),
    [devices],
  );
  const deviceIds = useMemo(() => pmDevices.map((d) => d.id), [pmDevices]);

  const { data: telemetries = [] as TelemetryData[], isLoading } = useQuery({
    queryKey: [...ENERGY_ANALYZER_QUERY_KEY, deviceIds],
    queryFn: ({ signal }) => energyAnalyzerApi.getLatest(deviceIds, signal),
    refetchInterval: 3000,
    enabled: deviceIds.length > 0,
  });

  const { data: realtimeData } = useRealtimeStream();
  const { data: mergedTelemetries = [] as TelemetryData[] } = useTelemetry({
    historicalData: telemetries,
    realtimeData,
  });

  const summaries: EnergyAnalyzerSummary[] = useMemo(
    () =>
      pmDevices.map((d) =>
        telemetriesToSummary(
          (mergedTelemetries as TelemetryData[]).filter((t: TelemetryData) => t.deviceId === d.id),
          d.id,
          d.name,
        ),
      ),
    [pmDevices, mergedTelemetries],
  );

  return { summaries, deviceIds, isLoading };
};
