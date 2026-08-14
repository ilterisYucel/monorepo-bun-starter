import type { ChartDataPoint } from "../../types";
import type { LogEntry } from "@gd-monorepo/shared-types";

export interface MultiLineChartLabels {
  series: string;
  last: string;
  min: string;
  max: string;
  avg: string;
  noData: string;
}

export interface MultiLineChartV2Props {
  data: ChartDataPoint[];
  title?: string;
  subtitle?: string;
  yAxisLabel?: string;
  height?: number;
  colors?: string[];
  showLegend?: boolean;
  /** Alt istatistik tablosu (Son/Min/Max/Ort) gösterilsin mi? Varsayılan: true */
  showStats?: boolean;
  isLoading?: boolean;
  annotations?: LogEntry[];
  labels?: MultiLineChartLabels;
  locale?: string;
}
