import type { ChartDataPoint } from "../../types";

export interface MultiLineChartProps {
  data: ChartDataPoint[];
  title?: string;
  subtitle?: string;
  yAxisLabel?: string;
  height?: number;
  colors?: string[];
  showLegend?: boolean;
  isLoading?: boolean;
}
