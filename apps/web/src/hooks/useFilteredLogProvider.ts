// apps/web/src/hooks/useFilteredLogProvider.ts
import { useMemo } from "react";
import { useLogStore } from "../stores/LogStore";
import type { LogProvider } from "@gd-monorepo/ui";

export const useFilteredLogProvider = (source: "system" | "command" | "rack" | "scheduler"): LogProvider => {
  const logs = useLogStore((s) => s.logs);
  const addLog = useLogStore((s) => s.addLog);
  const clearLogs = useLogStore((s) => s.clearLogs);

  return useMemo(() => {
    const filtered = logs.filter((log) => log.source === source);
    return { logs: filtered, addLog, clearLogs };
  }, [logs, source, addLog, clearLogs]);
};
