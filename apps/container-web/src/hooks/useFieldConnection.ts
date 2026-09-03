// apps/container-web/src/hooks/useFieldConnection.ts
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../lib/api-client";
import type { FieldConnectionStatus } from "@gd-monorepo/ws-tunnel";

export const FIELD_CONNECTION_QUERY_KEY = ["fieldConnection"];

/** 5 sn'de bir tazelenir — PPC/Field Bağlantısı göstergesini besler (T2.2). */
const REFETCH_INTERVAL_MS = 5000;

/**
 * useFieldConnection — FieldConnector PPC durumu (tasarım §6, §7).
 * `GET /api/status` kaynağı: `{ fieldConnected, state, lastHeartbeatAt }`.
 * Bağlantı yoksa/route yoksa (field tier) kapalı kabul edilir — UI bozulmaz.
 */
export const useFieldConnection = (): {
  fieldConnected: boolean;
  state: string;
  lastHeartbeatAt?: string;
} => {
  const { data } = useQuery<FieldConnectionStatus>({
    queryKey: FIELD_CONNECTION_QUERY_KEY,
    queryFn: async ({ signal }) => {
      const response = await apiClient.get<FieldConnectionStatus>("/status", {
        signal,
      });
      return response.data;
    },
    refetchInterval: REFETCH_INTERVAL_MS,
    retry: 1,
  });

  return {
    fieldConnected: data?.fieldConnected ?? false,
    state: data?.state ?? "offline",
    lastHeartbeatAt: data?.lastHeartbeatAt,
  };
};
