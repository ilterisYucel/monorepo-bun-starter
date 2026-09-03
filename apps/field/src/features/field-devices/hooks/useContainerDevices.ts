// apps/field/src/features/field-devices/hooks/useContainerDevices.ts
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { TelemetryData } from "@gd-monorepo/shared-types";
import { containersApi } from "../../containers/services/containersApi";
import { CONTAINERS_QUERY_KEY } from "../../containers/hooks/useContainerData";
import { deriveDevicesFromSnapshot } from "./useFieldDevices";
import type { DeviceInfo } from "../types/device";

export type DevicesSource = "tunnel" | "snapshot";

/**
 * 2026-09-02 — Devices sayfası veri kaynağı (konteyner kapsamlı):
 *
 * 1. `openSession` (tek giriş noktası — her çağrıda audit log basılmaz;
 *    gateway zaten açık oturumu "replaced" ile yeniler).
 * 2. Başarılıysa cihaz listesi MEVCUT HTTP tünelinden çekilir
 *    (`/containers/:cid/ui/api/unified/devices` — gerçek isim/model/tip).
 * 3. Oturum/liste başarısızsa (konteyner offline, rol reddi) snapshot'tan
 *    türetilmiş listeye düşülür — kademeli bozulma (tasarım §12.4).
 *
 * `latestTelemetry` seçili konteynerin snapshot'ıdır (Detay modal'ının
 * "Mevcut Değer" sütunu — ek istek YOK).
 */
export function useContainerDevices(fieldId: string, containerId: string) {
  const containersQuery = useQuery({
    queryKey: CONTAINERS_QUERY_KEY(fieldId),
    queryFn: () => containersApi.list(fieldId),
    refetchInterval: 5000,
    enabled: fieldId.length > 0,
  });

  const sessionQuery = useQuery({
    queryKey: ["containerSession", fieldId, containerId],
    queryFn: () => containersApi.openSession(fieldId, containerId),
    staleTime: 10 * 60 * 1000,
    enabled: fieldId.length > 0 && containerId.length > 0,
  });

  const sessionOk = sessionQuery.data?.ok === true;

  const devicesQuery = useQuery({
    queryKey: ["containerDevices", fieldId, containerId],
    queryFn: () => containersApi.listDevices(fieldId, containerId),
    enabled: sessionOk,
  });

  const containers = containersQuery.data ?? [];

  const snapshotDevices = useMemo<DeviceInfo[]>(() => {
    const container = containers.find((c) => c.containerId === containerId);
    if (!container) return [];
    return deriveDevicesFromSnapshot([container]);
  }, [containers, containerId]);

  const latestTelemetry: TelemetryData[] = useMemo(
    () =>
      containers.find((c) => c.containerId === containerId)?.latestTelemetry ?? [],
    [containers, containerId],
  );

  const tunnelDevices = devicesQuery.data;
  const devices = tunnelDevices ?? snapshotDevices;
  const source: DevicesSource = tunnelDevices ? "tunnel" : "snapshot";

  return {
    devices,
    source,
    latestTelemetry,
    isLoading:
      containersQuery.isLoading || (sessionOk && devicesQuery.isLoading),
    isError: sessionQuery.isError || devicesQuery.isError,
  };
}
