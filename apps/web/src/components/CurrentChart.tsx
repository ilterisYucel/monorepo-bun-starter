import React from "react";
import { TimeSeriesChart } from "./TimeSeriesChart";
import type { HistoricalDataPoint } from "../types";

interface CurrentChartProps {
  data: HistoricalDataPoint[];
  height?: number;
}

export const CurrentChart: React.FC<CurrentChartProps> = ({
  data,
  height = 300,
}) => {
  return (
    <TimeSeriesChart
      data={data}
      title="⚡ Rack Akımları (A)"
      unit="A"
      height={height}
    />
  );
};
