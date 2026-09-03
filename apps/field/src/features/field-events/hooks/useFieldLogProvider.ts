import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { LogProvider, LogEntry } from "@gd-monorepo/ui";
import { apiClient } from "../../../lib/api-client";

export const FIELD_LOGS_QUERY_KEY = (source: string) => ["fieldLogs", source];

/**
 * Faz 5 T5.4 — gerçek log kaynağı: field web-service `/api/logs`
 * (log_events ∪ system_logs — TamperLogger imzalı olaylar dahil).
 * 10 sn tazeleme; addLog/clearLogs istemci-çöpe atılır (sunucu tek kaynaktır).
 */
export function useFieldLogProvider(source: "system" | "user"): LogProvider {
  const { data } = useQuery({
    queryKey: FIELD_LOGS_QUERY_KEY(source),
    queryFn: async () => {
      const { data: body } = await apiClient.get<{ logs: LogEntry[] }>(
        "/logs",
        { params: { source, limit: 200 } },
      );
      return body.logs;
    },
    refetchInterval: 10000,
  });

  const logs = useMemo(() => data ?? [], [data]);
  const addLog = useMemo(() => () => {}, []);
  const clearLogs = useMemo(() => () => {}, []);

  return { logs, addLog, clearLogs };
}
