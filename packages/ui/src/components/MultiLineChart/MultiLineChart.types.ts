import type { ChartDataPoint } from "../../types";
import type { LogEntry } from "@gd-monorepo/shared-types";

export interface MultiLineChartProps {
  data: ChartDataPoint[];
  title?: string;
  subtitle?: string;
  yAxisLabel?: string;
  height?: number;
  colors?: string[];
  showLegend?: boolean;
  isLoading?: boolean;
  annotations?: LogEntry[];
}
