// packages/ui/src/types/chart.ts

/**
 * Chart veri noktası tipi
 * MultiLineChartV2 ve TelemetryChart tarafından kullanılır
 */
export interface ChartDataPoint {
  timestamp: string;
  [key: string]: string | number;
}