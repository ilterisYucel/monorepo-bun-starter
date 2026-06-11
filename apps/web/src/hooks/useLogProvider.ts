// apps/web/src/hooks/useLogProvider.ts
import { useLogStore } from "../stores/LogStore";
import type { UseLogProvider } from "@gd-monorepo/ui";

export const useLogProvider: UseLogProvider = () => {
  const { logs, addLog, clearLogs } = useLogStore();
  return { logs, addLog, clearLogs };
};