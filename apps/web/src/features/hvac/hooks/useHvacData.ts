// apps/web/src/features/hvac/hooks/useHvacData.ts
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { hvacApi } from "../services/hvacApi";
import { telemetriesToHvacUnits } from "../utils/hvacHelpers";
import { useDevicesStore } from "../../../stores/devicesStore";
import type { HvacAverages } from "../types/hvac";

export const HVAC_QUERY_KEY = ["hvac"];

function calculateAverages(
  units: ReturnType<typeof telemetriesToHvacUnits>,
): HvacAverages {
  const running = units.filter((u) => u.status === "running");
  return {
    avgCurrentTemp:
      running.length > 0
        ? running.reduce((s, u) => s + (u.currentTemp ?? 0), 0) /
          running.length
        : 0,
    avgReturnHumidity:
      running.length > 0
        ? running.reduce((s, u) => s + (u.returnHumidity ?? 0), 0) /
          running.length
        : 0,
    runningUnits: running.length,
    totalUnits: units.length,
  };
}

export const useHvacData = () => {
  const devices = useDevicesStore((s) => s.devices);
  const hvacIds = useMemo(
    () => devices.filter((d) => d.type === "hvac").map((d) => d.id),
    [devices],
  );

  const { data: telemetries = [], isLoading, refetch } = useQuery({
    queryKey: [...HVAC_QUERY_KEY, hvacIds],
    queryFn: () => hvacApi.getLatest(hvacIds),
    refetchInterval: 5000,
  });

  const units = telemetriesToHvacUnits(telemetries);
  const averages = calculateAverages(units);

  return { units, averages, isLoading, refetch };
};
