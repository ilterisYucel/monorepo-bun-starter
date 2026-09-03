// apps/field/src/features/containers/hooks/useContainerTelemetry.ts
import { useQuery } from "@tanstack/react-query";
import { containersApi } from "../services/containersApi";
import type { FieldContainer } from "../services/containersApi";

export const CONTAINER_TELEMETRY_QUERY_KEY = (
  fieldId: string,
  containerId: string,
) => ["containerTelemetry", fieldId, containerId];

/**
 * Faz 5 T5.2 — gerçek veri:
 * - `latest` = FieldConnector snapshot'ı (`/containers` içindeki en güncel).
 * - `timeSeries` = tarihsel downsampled seri (ContainerProxy → konteyner).
 */
export function useContainerTelemetry(fieldId: string, containerId: string) {
  const listQuery = useQuery({
    queryKey: ["containers", fieldId],
    queryFn: () => containersApi.list(fieldId),
    refetchInterval: 5000,
    enabled: fieldId.length > 0,
  });

  const container: FieldContainer | undefined = listQuery.data?.find(
    (c) => c.containerId === containerId,
  );

  const seriesQuery = useQuery({
    queryKey: CONTAINER_TELEMETRY_QUERY_KEY(fieldId, containerId),
    queryFn: () => containersApi.timeSeries(fieldId, containerId, 120),
    refetchInterval: 30000,
    enabled: fieldId.length > 0 && containerId.length > 0,
  });

  return {
    container,
    latest: container?.latestTelemetry ?? [],
    timeSeries: seriesQuery.data ?? [],
    isLoading: listQuery.isLoading,
    isError: listQuery.isError || seriesQuery.isError,
  };
}
