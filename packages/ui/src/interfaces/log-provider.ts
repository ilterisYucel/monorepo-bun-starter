// packages/ui/src/interfaces/log-provider.ts

import type { LogEntry } from "@gd-monorepo/shared-types";



/**
 * LogProvider interface'i
 * UI bileşenleri bu interface'i implemente eden bir provider bekler.
 * app-web'de Zustand, Redux veya başka bir state yönetimi ile implemente edilir.
 */
export interface LogProvider {
  logs: LogEntry[];
  addLog: (entry: Omit<LogEntry, "id" | "timestamp">) => void;
  clearLogs: () => void;
}

/**
 * useLog hook'unun tipi
 */
export type UseLogProvider = () => LogProvider;