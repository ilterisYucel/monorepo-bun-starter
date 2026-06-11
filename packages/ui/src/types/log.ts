// packages/ui/src/types/log.ts

/**
 * Log kaydı tipi
 * LogTerminal, useLog hook, LogStore tarafından kullanılır
 */
export interface LogEntry {
  id: string;
  timestamp: string;
  type: "info" | "success" | "error" | "warning";
  source: "system" | "command" | "rack" | "scheduler";
  message: string;
  details?: string;
}