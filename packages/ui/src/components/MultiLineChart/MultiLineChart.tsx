// packages/ui/src/components/MultiLineChart/MultiLineChart.tsx
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
import type { MultiLineChartProps } from "./MultiLineChart.types";
import * as S from "./MultiLineChart.styles";

export const MultiLineChart: React.FC<MultiLineChartProps> = ({
  data,
  title,
  yAxisLabel,
  height = 300,
  colors = S.DEFAULT_COLORS,
  showLegend = true,
}) => {
  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => {
      return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
    });
  }, [data]);

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

  const lines = useMemo(() => {
    if (data.length === 0) return [];
    const firstItem = data[0];
    return Object.keys(firstItem as any).filter((key) => key !== "timestamp");
  }, [data]);

  if (data.length === 0) {
    return (
      <S.Empty style={{ height: `${height}px` }}>
        <p>Henüz veri yok...</p>
      </S.Empty>
    );
  }

  return (
    <S.Container>
      <S.Title>{title}</S.Title>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={formattedData}>
          <CartesianGrid
            stroke={S.cartesianGrid.stroke}
            strokeDasharray={S.cartesianGrid.strokeDasharray}
          />
          <XAxis
            dataKey="timestamp"
            stroke={S.xAxis.stroke}
            tick={{ fill: S.xAxis.fill, fontSize: S.xAxis.fontSize }}
            interval="preserveStartEnd"
          />
          <YAxis
            stroke={S.yAxis.stroke}
            tick={{ fill: S.yAxis.fill, fontSize: S.yAxis.fontSize }}
            label={
              yAxisLabel
                ? {
                    value: yAxisLabel,
                    angle: -90,
                    position: "insideLeft",
                    fill: S.yAxis.fill,
                  }
                : undefined
            }
          />
          <Tooltip
            contentStyle={S.tooltipContent}
            labelStyle={S.tooltipLabel}
          />
          {showLegend && <Legend wrapperStyle={{ color: S.legend.color }} />}
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
    </S.Container>
  );
};
