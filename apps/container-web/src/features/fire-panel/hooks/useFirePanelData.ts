import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTelemetry } from "@gd-monorepo/ui";
import type { TelemetryData } from "@gd-monorepo/shared-types";
import { useRealtimeStream } from "../../../contexts/RealtimeContext";
import { useDevicesStore } from "../../../stores/devicesStore";
import { firePanelApi } from "../services/firePanelApi";
import { telemetriesToFirePanelSummary } from "../utils/firePanelHelpers";
import type { FirePanelSummary } from "../types/fire-panel";

export const FIRE_PANEL_QUERY_KEY = ["fire-panel"];

export const useFirePanelData = () => {
  const devices = useDevicesStore((s) => s.devices);
  const fpDevices = useMemo(
    () => devices.filter((d) => d.type === "fire-panel" || d.id?.startsWith("EP")),
    [devices],
  );
  const deviceIds = useMemo(() => fpDevices.map((d) => d.id), [fpDevices]);

  const { data: telemetries = [] as TelemetryData[], isLoading } = useQuery({
    queryKey: [...FIRE_PANEL_QUERY_KEY, deviceIds],
    queryFn: ({ signal }) => firePanelApi.getLatest(deviceIds, signal),
    refetchInterval: 2000,
    enabled: deviceIds.length > 0,
  });

  const { data: realtimeData } = useRealtimeStream();
  const { data: mergedTelemetries = [] as TelemetryData[] } = useTelemetry({
    historicalData: telemetries,
    realtimeData,
  });

  const summary: FirePanelSummary = useMemo(
    () => {
      if (mergedTelemetries.length === 0) {
        return { fault: false, fire: false, firstStageAlarm: false, secondStageAlarm: false, discharged: false, extract: false, modeAuto: true, hold: false, abort: false };
      }
      return telemetriesToFirePanelSummary(mergedTelemetries as TelemetryData[]);
    },
    [mergedTelemetries],
  );

  return { summary, deviceIds, isLoading };
};
