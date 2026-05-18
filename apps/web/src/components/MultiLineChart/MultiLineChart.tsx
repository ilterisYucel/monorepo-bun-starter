import React, { useMemo } from "react";
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

export interface ChartDataPoint {
  timestamp: string;
  [key: string]: string | number; // Dinamik key'ler (voltage, current, rack_1, rack_2, vs.)
}

interface MultiLineChartProps {
  data: ChartDataPoint[];
  title: string;
  yAxisLabel?: string;
  height?: number;
  colors?: string[];
  showLegend?: boolean;
}

// Default renk paleti (16 renk, döngüsel)
const DEFAULT_COLORS = [
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

export const MultiLineChart: React.FC<MultiLineChartProps> = ({
  data,
  title,
  yAxisLabel,
  height = 300,
  colors = DEFAULT_COLORS,
  showLegend = true,
}) => {
  // Timestamp'e göre sıralanmış veriyi hazırla
  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => {
      return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
    });
  }, [data]);

  // Timestamp'i formatla (sadece saat:dakika:saniye)
  const formattedData = useMemo(() => {
    return sortedData.map((point) => ({
      ...point,
      timestamp: new Date(point.timestamp).toLocaleTimeString("tr-TR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
    }));
  }, [sortedData]);

  // Çizilecek line'ları bul (timestamp hariç tüm key'ler)
  const lines = useMemo(() => {
    if (data.length === 0) return [];
    const firstItem = data[0];
    return Object.keys(firstItem).filter((key) => key !== "timestamp");
  }, [data]);

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
        <LineChart data={formattedData}>
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
            label={
              yAxisLabel
                ? {
                    value: yAxisLabel,
                    angle: -90,
                    position: "insideLeft",
                    fill: "#9ca3af",
                  }
                : undefined
            }
          />
          <Tooltip
            contentStyle={{
              background: "#1f1f2e",
              border: "1px solid #2a2a3a",
              borderRadius: "8px",
            }}
            labelStyle={{ color: "#e5e7eb" }}
          />
          {showLegend && <Legend wrapperStyle={{ color: "#9ca3af" }} />}
          {lines.map((line, index) => (
            <Line
              key={line}
              type="monotone"
              dataKey={line}
              stroke={colors[index % colors.length]}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 6 }}
              name={line}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
