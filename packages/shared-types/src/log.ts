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
}

export interface LogQueryParams {
  sources?: LogSource[];
  types?: LogType[];
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}
