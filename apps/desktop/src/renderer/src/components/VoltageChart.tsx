import React from "react";
import { TimeSeriesChart } from "./TimeSeriesChart";
import type { HistoricalDataPoint } from "../types";

interface VoltageChartProps {
  data: HistoricalDataPoint[];
  height?: number;
}

export const VoltageChart: React.FC<VoltageChartProps> = ({
  data,
  height = 300,
}) => {
  return (
    <TimeSeriesChart
      data={data}
      title="🔋 Rack Voltajları (mV)"
      unit="mV"
      height={height}
    />
  );
};
