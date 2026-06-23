// apps/web/src/hooks/useLogProvider.ts
import { useEffect, useMemo } from "react";
import { useLogStore } from "../stores/LogStore";
import type { UseLogProvider } from "@gd-monorepo/ui";

export const useLogProvider: UseLogProvider = () => {
  const logs = useLogStore((s) => s.logs);
  const addLog = useLogStore((s) => s.addLog);
  const clearLogs = useLogStore((s) => s.clearLogs);

  useEffect(() => {
    useLogStore.getState().fetchBackend();
  }, []);

  return useMemo(() => ({ logs, addLog, clearLogs }), [logs, addLog, clearLogs]);
};
