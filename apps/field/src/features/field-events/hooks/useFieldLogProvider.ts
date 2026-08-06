import { useMemo } from "react";
import type { LogProvider, LogEntry } from "@gd-monorepo/ui";
import { mockLogs } from "../services/mockLogs";

export function useFieldLogProvider(source: "system" | "user"): LogProvider {
  const logs = useMemo(() => mockLogs(source), [source]);

  const addLog = useMemo(() => () => {}, []);
  const clearLogs = useMemo(() => () => {}, []);

  return { logs, addLog, clearLogs };
}
