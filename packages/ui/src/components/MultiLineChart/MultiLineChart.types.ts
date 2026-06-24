import type { ChartDataPoint } from "../../types";
import type { EventAnnotation } from "../../interfaces/event-annotations";

export interface MultiLineChartProps {
  data: ChartDataPoint[];
  title?: string;
  subtitle?: string;
  yAxisLabel?: string;
  height?: number;
  colors?: string[];
  showLegend?: boolean;
  isLoading?: boolean;
  annotations?: EventAnnotation[];
}
