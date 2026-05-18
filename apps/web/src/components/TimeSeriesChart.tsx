import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { HistoricalDataPoint } from "../types";

interface TimeSeriesChartProps {
  data: HistoricalDataPoint[];
  title: string;
  unit: string;
  height?: number;
}

interface ChartDataPoint {
  timestamp: string;
  [key: string]: number | string;
}

export const TimeSeriesChart: React.FC<TimeSeriesChartProps> = ({
  data,
  title,
  unit,
  height = 300,
}) => {
  // Rack'lere göre gruplandır ve timestamp'e göre düzenle
  const processData = (): ChartDataPoint[] => {
    const groupedByTimestamp: { [key: string]: ChartDataPoint } = {};

    // Önce tüm verileri timestamp'e göre grupla
    data.forEach((point) => {
      const timestamp = new Date(point.timestamp).toLocaleTimeString("tr-TR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });

      if (!groupedByTimestamp[timestamp]) {
        groupedByTimestamp[timestamp] = { timestamp };
      }

      const rackKey = `Rack ${point.rackId}`;
      groupedByTimestamp[timestamp][rackKey] = point.value;
    });

    // Timestamp'e göre sırala
    return Object.values(groupedByTimestamp).sort((a, b) => {
      return a.timestamp.localeCompare(b.timestamp);
    });
  };

  // Benzersiz rack'leri bul (renkler için)
  const uniqueRacks = [...new Set(data.map((d) => `Rack ${d.rackId}`))];

  // Renk paleti
  const colorPalette = [
    "#3b82f6",
    "#ef4444",
    "#10b981",
    "#f59e0b",
    "#8b5cf6",
    "#ec4899",
    "#06b6d4",
    "#84cc16",
    "#f97316",
    "#6366f1",
    "#14b8a6",
    "#d946ef",
    "#0ea5e9",
    "#eab308",
    "#a855f7",
    "#22c55e",
  ];

  const chartData = processData();

  if (data.length === 0) {
    return (
      <div
        style={{
          height,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#1f1f2e",
          borderRadius: "12px",
        }}
      >
        <p style={{ color: "#6b7280" }}>Henüz veri yok...</p>
      </div>
    );
  }

  return (
    <div
      style={{ background: "#1f1f2e", borderRadius: "12px", padding: "16px" }}
    >
      <h4 style={{ marginBottom: "16px", color: "#e5e7eb" }}>{title}</h4>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3a" />
          <XAxis
            dataKey="timestamp"
            stroke="#9ca3af"
            tick={{ fill: "#9ca3af", fontSize: 11 }}
            interval="preserveStartEnd"
          />
          <YAxis
            stroke="#9ca3af"
            tick={{ fill: "#9ca3af", fontSize: 11 }}
            label={{
              value: unit,
              angle: -90,
              position: "insideLeft",
              fill: "#9ca3af",
            }}
          />
          <Tooltip
            contentStyle={{
              background: "#1f1f2e",
              border: "1px solid #2a2a3a",
              borderRadius: "8px",
            }}
            labelStyle={{ color: "#e5e7eb" }}
            itemStyle={{ color: "#e5e7eb" }}
          />
          <Legend wrapperStyle={{ color: "#9ca3af" }} />
          {uniqueRacks.map((rack, index) => (
            <Line
              key={rack}
              type="monotone"
              dataKey={rack}
              stroke={colorPalette[index % colorPalette.length]}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 6 }}
              name={rack}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
