// apps/web/src/hooks/useFilteredLogProvider.ts
import { useMemo } from "react";
import { useLogStore } from "../stores/LogStore";
import type { LogProvider } from "@gd-monorepo/ui";

export const useFilteredLogProvider = (source: "system" | "command" | "rack" | "scheduler"): LogProvider => {
  const { logs, addLog, clearLogs } = useLogStore();

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => log.source === source);
  }, [logs, source]);

  return {
    logs: filteredLogs,
    addLog,
    clearLogs,
  };
};