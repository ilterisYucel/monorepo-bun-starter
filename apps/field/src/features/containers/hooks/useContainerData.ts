// apps/field/src/features/containers/hooks/useContainerData.ts
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { containersApi } from "../services/containersApi";
import type { FieldContainer } from "../services/containersApi";
import type { TelemetryData } from "@gd-monorepo/shared-types";

export const CONTAINERS_QUERY_KEY = (fieldId: string) => ["containers", fieldId];

/** Kart modeli — ContainerCard prop sözleşmesi. */
export interface ContainerSummary {
  containerId: string;
  name: string;
  status: "online" | "warning" | "offline";
  connected: boolean;
  soc?: number;
  powerKw?: number;
  temperature?: number;
  deviceCount: number;
  activeDeviceCount: number;
  latestTelemetry: TelemetryData[];
}

/** connectionStatus → kart durumu: stale/error → warning, idle → offline. */
export function statusForContainer(
  connectionStatus: FieldContainer["connectionStatus"],
): ContainerSummary["status"] {
  if (connectionStatus === "connected") return "online";
  if (connectionStatus === "stale" || connectionStatus === "error") return "warning";
  return "offline";
}

/**
 * Konteyner telemetrisinden kart özeti çıkarır (saf — test edilir).
 * Kanonik metrik eşlemesi (canonical attr — AGENTS.md) + name fallback.
 */
export function summarizeContainer(
  container: FieldContainer,
): ContainerSummary {
  const telemetry = container.latestTelemetry;
  const bscDevices = [
    ...new Set(
      telemetry
        .filter((t) => t.deviceId.startsWith("BSC"))
        .map((t) => t.deviceId),
    ),
  ];

  let totalPower = 0;
  let totalSoc = 0;
  let socCount = 0;
  let maxTemp = 0;

  for (const bscId of bscDevices) {
    const powerItem =
      telemetry.find(
        (t) =>
          (t.tags?.canonical === "charge_power" ||
            t.tags?.canonical === "discharge_power") &&
          t.deviceId === bscId &&
          t.tags?.rack_id === "system",
      ) ??
      telemetry.find(
        (t) => t.name === "Power" && t.deviceId === bscId && t.tags?.rack_id === "system",
      );
    const socItem =
      telemetry.find(
        (t) =>
          t.tags?.canonical === "soc" &&
          t.deviceId === bscId &&
          t.tags?.rack_id === "system",
      ) ??
      telemetry.find(
        (t) => t.name === "SOC" && t.deviceId === bscId && t.tags?.rack_id === "system",
      );
    const tempItem = telemetry.find(
      (t) => t.name === "MaxCellTemperature" && t.deviceId === bscId,
    );

    if (powerItem) totalPower += (powerItem.value as number) || 0;
    if (socItem) {
      totalSoc += (socItem.value as number) || 0;
      socCount++;
    }
    if (tempItem) maxTemp = Math.max(maxTemp, (tempItem.value as number) || 0);
  }

  const uniqueDevices = new Set(telemetry.map((t) => t.deviceId));
  let activeDevices = 0;
  for (const deviceId of uniqueDevices) {
    const entries = telemetry.filter((t) => t.deviceId === deviceId);
    if (deviceId.startsWith("BSC")) {
      const power =
        entries.find(
          (t) =>
            (t.tags?.canonical === "charge_power" ||
              t.tags?.canonical === "discharge_power") &&
            t.tags?.rack_id === "system",
        ) ?? entries.find((t) => t.name === "Power" && t.tags?.rack_id === "system");
      if (power && (power.value as number) > 0) activeDevices++;
    } else if (deviceId.startsWith("CB")) {
      if (entries.find((t) => t.name === "Is Closed")?.value === true) activeDevices++;
    } else if (deviceId.startsWith("DC")) {
      if (entries.find((t) => t.name === "Is On")?.value === true) activeDevices++;
    } else if (deviceId.startsWith("HVAC")) {
      if ((entries.find((t) => t.name === "Room Temperature")?.value as number) > 0) {
        activeDevices++;
      }
    }
  }

  return {
    containerId: container.containerId,
    name: container.containerId,
    status: statusForContainer(container.connectionStatus),
    connected: container.connectionStatus === "connected",
    ...(socCount > 0 ? { soc: totalSoc / socCount } : {}),
    powerKw: totalPower,
    ...(maxTemp > 0 ? { temperature: maxTemp } : {}),
    deviceCount: uniqueDevices.size,
    activeDeviceCount: activeDevices,
    latestTelemetry: telemetry,
  };
}

/** Faz 5 T5.1 — gerçek API: konteyner kartları (5 sn tazeleme — PPC). */
export function useContainerData(fieldId: string) {
  const { data, isLoading, isError } = useQuery({
    queryKey: CONTAINERS_QUERY_KEY(fieldId),
    queryFn: () => containersApi.list(fieldId),
    refetchInterval: 5000,
    enabled: fieldId.length > 0,
  });

  const containers = useMemo(
    () => (data ?? []).map((container) => summarizeContainer(container)),
    [data],
  );

  return { containers, isLoading, isError };
}
