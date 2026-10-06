// apps/web/src/features/hvac/hooks/useHvacData.ts
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { telemetriesToHvacUnits, hvacSkeleton } from "../utils/hvacHelpers";
import { useDeviceTelemetry } from "../../telemetry/hooks/useDeviceTelemetry";
import { devicesApi } from "../../devices/services/devicesApi";
import { useDevicesStore } from "../../../stores/devicesStore";
import type { TelemetryConfigResponse } from "../../devices/types/telemetry-config";
import type { HvacAverages, HvacUnit } from "../types/hvac";

export const HVAC_QUERY_KEY = ["hvac"];

function calculateAverages(units: HvacUnit[]): HvacAverages {
  const running = units.filter((u) => u.status === "running");
  return {
    avgCurrentTemp:
      running.length > 0
        ? running.reduce((s, u) => s + (u.currentTemp ?? 0), 0) / running.length
        : 0,
    avgReturnHumidity:
      running.length > 0
        ? running.reduce((s, u) => s + (u.returnHumidity ?? 0), 0) / running.length
        : 0,
    runningUnits: running.length,
    totalUnits: units.length,
  };
}

/**
 * useHvacData — HVAC bloğu için component-kapsamlı veri:
 * - Yapı (ünite/oda iskeleti) CİHAZ KATALOĞUNDAN (devices + telemetry-config) kurulur;
 *   telemetri yokken bile bileşenler yer tutucuyla kalır (kaybolmaz).
 * - Değerler `useDeviceTelemetry` (REST keepPreviousData + WS + dedup) ile overlay edilir.
 */
export const useHvacData = () => {
  const devices = useDevicesStore((s) => s.devices);
  const hvacIds = useMemo(
    () => devices.filter((d) => d.type === "hvac").map((d) => d.id),
    [devices],
  );
  const idsKey = useMemo(() => [...hvacIds].sort().join(","), [hvacIds]);

  const { telemetries, isLoading } = useDeviceTelemetry({
    deviceIds: hvacIds,
    intervalMs: 10000,
    limit: 300,
  });

  const { data: configs = [] } = useQuery({
    queryKey: ["hvac-configs", idsKey],
    queryFn: () =>
      Promise.all(
        hvacIds.map((id) => devicesApi.getTelemetryConfig(id).catch(() => null)),
      ),
    enabled: hvacIds.length > 0,
    staleTime: Infinity,
  });

  const roomByDevice = useMemo(() => {
    const map = new Map<string, string>();
    for (const config of configs as (TelemetryConfigResponse | null)[]) {
      if (config === null) continue;
      const room = config.telemetry.find((t) => t.tags?.room)?.tags?.room;
      if (room !== undefined) map.set(config.deviceId, room);
    }
    return map;
  }, [configs]);

  const units = useMemo(() => {
    const telemetryUnits = telemetriesToHvacUnits(telemetries);
    const byId = new Map<number, HvacUnit>();
    for (const unit of telemetryUnits) byId.set(unit.id, unit);
    return hvacSkeleton(hvacIds, roomByDevice)
      .map((skeleton) => byId.get(skeleton.id) ?? skeleton)
      .sort((a, b) => a.id - b.id);
  }, [hvacIds, telemetries, roomByDevice]);

  const averages = calculateAverages(units);

  return { units, averages, isLoading };
};
