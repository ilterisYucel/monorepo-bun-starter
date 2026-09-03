export type LogType = "info" | "success" | "error" | "warning";
export type LogSource = "system" | "user";

export interface LogEntry {
  id: string;
  timestamp: string;
  type: LogType;
  source: LogSource;
  message: string;
  details?: string;
  fixed?: boolean;
  tags?: Record<string, string>;
  /**
   * Cihaz alarmı metadata'sı (Faz 0 eki) — yalnızca alarm terminalinden
   * gelen satırlarda dolu. LogTerminal bu alanı taşıyan satırlarda
   * "Çözüldü" kutucuğu render eder.
   */
  alarm?: {
    deviceId: string;
    alarmName: string;
    resolved: boolean;
    resolvedBy?: string;
    resolvedAt?: string;
  };
}

export interface LogQueryParams {
  sources?: LogSource[];
  types?: LogType[];
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}
