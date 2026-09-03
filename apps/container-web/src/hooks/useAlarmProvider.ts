// apps/container-web/src/hooks/useAlarmProvider.ts
import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { alarmsApi } from "../features/alarms/services/alarmsApi";
import type { LogProvider } from "@gd-monorepo/ui";
import type { DeviceAlarmState, LogEntry, LogType } from "@gd-monorepo/shared-types";

export const ALARMS_QUERY_KEY = ["alarms"];

const SEVERITY_TO_TYPE: Record<DeviceAlarmState["severity"], LogType> = {
  error: "error",
  warning: "warning",
  info: "info",
};

/** Durum satırını LogTerminal sözleşmesine eşler (alarm metadata dahil). */
function toLogEntry(alarm: DeviceAlarmState): LogEntry {
  return {
    id: `${alarm.deviceId}:${alarm.alarmName}`,
    timestamp: alarm.startedAt ?? alarm.endedAt ?? alarm.lastChangedAt,
    type: SEVERITY_TO_TYPE[alarm.severity],
    source: "system",
    message: alarm.alarmName,
    details: alarm.description,
    alarm: {
      deviceId: alarm.deviceId,
      alarmName: alarm.alarmName,
      resolved: alarm.resolved,
      resolvedBy: alarm.resolvedBy,
      resolvedAt: alarm.resolvedAt,
    },
  };
}

/**
 * useAlarmProvider — Cihaz Alarmları terminalinin veri sağlayıcısı (Faz 0 eki).
 * GET /api/unified/alarms (10 sn tazeleme) + resolve mutation; LogTerminal
 * kutucuğu `resolveAlarm` üzerinden tetiklenir.
 */
export function useAlarmProvider(): LogProvider {
  const queryClient = useQueryClient();

  const { data: alarms = [] } = useQuery({
    queryKey: ALARMS_QUERY_KEY,
    queryFn: alarmsApi.list,
    staleTime: 5000,
    refetchInterval: 10000,
  });

  const resolveMutation = useMutation({
    mutationFn: ({ deviceId, alarmName }: { deviceId: string; alarmName: string }) =>
      alarmsApi.resolve(deviceId, alarmName),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ALARMS_QUERY_KEY });
    },
  });

  return useMemo<LogProvider>(
    () => ({
      logs: alarms.map(toLogEntry),
      addLog: () => undefined,
      clearLogs: () => undefined,
      resolveAlarm: (entry: LogEntry) => {
        if (entry.alarm && !entry.alarm.resolved) {
          void resolveMutation.mutateAsync({
            deviceId: entry.alarm.deviceId,
            alarmName: entry.alarm.alarmName,
          });
        }
      },
    }),
    [alarms, resolveMutation],
  );
}
