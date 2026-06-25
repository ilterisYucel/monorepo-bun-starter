// apps/web/src/hooks/useFilteredLogProvider.ts
import { useMemo } from "react";
import { useLogStore } from "../stores/LogStore";
import type { LogProvider } from "@gd-monorepo/ui";

import type { LogSource } from "@gd-monorepo/shared-types";

export const useFilteredLogProvider = (source: LogSource): LogProvider => {
  const logs = useLogStore((s) => s.logs);
  const addLog = useLogStore((s) => s.addLog);
  const clearLogs = useLogStore((s) => s.clearLogs);

  return useMemo(() => {
    const filtered = logs.filter((log) => log.source === source);
    return { logs: filtered, addLog, clearLogs };
  }, [logs, source, addLog, clearLogs]);
};
