import type { LogProvider } from "../../interfaces/log-provider";
import type { TagFilterConfig } from "../TelemetryChart/TelemetryChart.types";

export interface LogTerminalProps {
  provider: LogProvider;
  maxHeight?: number;
  title?: string;
  titleIcon?: React.ReactNode;
  tagFilters?: TagFilterConfig[];
}
