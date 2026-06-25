import React, { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import type { MultiLineChartProps } from "./MultiLineChart.types";
import type { LogEntry } from "@gd-monorepo/shared-types";
import * as S from "./MultiLineChart.styles";

const ANNOTATION_COLORS: Record<LogEntry["type"], string> = {
  error: "#ef4444",
  warning: "#f59e0b",
  success: "#10b981",
  info: "#3b82f6",
};

const formatTooltipTime = (timestamp: string): string => {
  const d = new Date(timestamp);
  if (isNaN(d.getTime())) return timestamp;
  return d.toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

const formatStat = (v: number | string): string => {
  if (typeof v === "string") return v;
  return v.toLocaleString("tr-TR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
};

const formatTooltipVal = (v: number | string): string => {
  if (typeof v === "number") {
    return v.toLocaleString("tr-TR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  }
  return String(v);
};

interface SeriesStats {
  last: number;
  min: number;
  max: number;
  avg: number;
}

export const MultiLineChart: React.FC<MultiLineChartProps> = ({
  data,
  title,
  subtitle,
  yAxisLabel,
  height = 300,
  colors = S.DEFAULT_COLORS,
  showLegend = true,
  isLoading = false,
  annotations,
}) => {
  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => {
      return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
    });
  }, [data]);

  const lines = useMemo(() => {
    if (data.length === 0) return [];
    const firstItem = data[0];
    return Object.keys(firstItem as any).filter((key) => key !== "timestamp" && !key.startsWith("_"));
  }, [data]);

  const legendPayload = useMemo(
    () =>
      lines.map((line, i) => ({
        dataKey: line,
        color: colors[i % colors.length],
        value: line,
      })),
    [lines, colors],
  );

  const legendStats = useMemo(() => {
    if (sortedData.length === 0) return {} as Record<string, SeriesStats>;
    const result: Record<string, SeriesStats> = {};
    for (const key of lines) {
      const values = sortedData
        .map((d) => (d as any)[key])
        .filter((v): v is number => typeof v === "number");
      if (values.length === 0) continue;
      const sum = values.reduce((a, b) => a + b, 0);
      result[key] = {
        last: values[values.length - 1],
        min: Math.min(...values),
        max: Math.max(...values),
        avg: sum / values.length,
      };
    }
    return result;
  }, [sortedData, lines]);

  const tickFormat = useMemo(() => {
    if (sortedData.length < 2) {
      return (ts: string) => {
        const d = new Date(ts);
        if (isNaN(d.getTime())) return ts;
        return d.toLocaleTimeString("tr-TR", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });
      };
    }

    const first = new Date(sortedData[0].timestamp).getTime();
    const last = new Date(sortedData[sortedData.length - 1].timestamp).getTime();
    const spanHours = (last - first) / (1000 * 60 * 60);

    if (spanHours <= 2) {
      return (ts: string) => {
        const d = new Date(ts);
        if (isNaN(d.getTime())) return ts;
        return d.toLocaleTimeString("tr-TR", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });
      };
    }
    if (spanHours <= 48) {
      return (ts: string) => {
        const d = new Date(ts);
        if (isNaN(d.getTime())) return ts;
        return d.toLocaleTimeString("tr-TR", {
          hour: "2-digit",
          minute: "2-digit",
        });
      };
    }
    if (spanHours <= 720) {
      return (ts: string) => {
        const d = new Date(ts);
        if (isNaN(d.getTime())) return ts;
        const day = String(d.getDate()).padStart(2, "0");
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const time = d.toLocaleTimeString("tr-TR", {
          hour: "2-digit",
          minute: "2-digit",
        });
        return `${day}/${month} ${time}`;
      };
    }
    return (ts: string) => {
      const d = new Date(ts);
      if (isNaN(d.getTime())) return ts;
      const day = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const year = String(d.getFullYear()).slice(2);
      return `${day}/${month}/${year}`;
    };
  }, [sortedData]);

  const tooltipContent: React.FC<any> = ({ active, payload, label }) => {
    if (!active) return null;
    const matchingEvents = annotations?.filter((a) => a.timestamp === label) ?? [];
    if (!payload?.length && matchingEvents.length === 0) return null;
    return (
      <S.TooltipWrapper>
        <S.TooltipTimestamp>{formatTooltipTime(label)}</S.TooltipTimestamp>
        {payload?.length > 0 && (
          <>
            <S.TooltipDivider />
            {payload
              .filter((entry: any) => entry.dataKey !== "_annotations")
              .map((entry: any) => (
                <S.TooltipRow key={entry.dataKey}>
                  <S.TooltipColorDot style={{ background: entry.color }} />
                  <S.TooltipName>{entry.name}</S.TooltipName>
                  <S.TooltipValue>{formatTooltipVal(entry.value)}</S.TooltipValue>
                </S.TooltipRow>
              ))}
          </>
        )}
        {matchingEvents.length > 0 && (
          <>
            <S.TooltipDivider />
            {matchingEvents.map((e) => (
              <S.TooltipEvent key={e.message} color={ANNOTATION_COLORS[e.type]}>
                {e.type.toUpperCase()}: {e.message}
              </S.TooltipEvent>
            ))}
          </>
        )}
      </S.TooltipWrapper>
    );
  };

  if (isLoading) {
    return <S.Skeleton style={{ height: `${height + 80}px` }} />;
  }

  if (data.length === 0) {
    return (
      <S.Empty style={{ height: `${height}px` }}>
        <p>Henüz veri yok...</p>
      </S.Empty>
    );
  }

  return (
    <S.Container>
      {title && <S.Title>{title}</S.Title>}
      {subtitle && <S.Subtitle>{subtitle}</S.Subtitle>}
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={sortedData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
          <CartesianGrid
            stroke={S.cartesianGrid.stroke}
            strokeDasharray={S.cartesianGrid.strokeDasharray}
            horizontal={true}
            vertical={false}
          />
          <XAxis
            dataKey="timestamp"
            stroke={S.xAxis.stroke}
            tick={{ fill: S.xAxis.fill, fontSize: S.xAxis.fontSize }}
            tickFormatter={tickFormat}
            tickCount={7}
          />
          <YAxis
            stroke={S.yAxis.stroke}
            tick={{ fill: S.yAxis.fill, fontSize: S.yAxis.fontSize }}
            width={60}
            label={
              yAxisLabel
                ? {
                    value: yAxisLabel,
                    angle: -90,
                    position: "insideLeft",
                    fill: S.yAxis.fill,
                    style: { textAnchor: "middle" },
                  }
                : undefined
            }
          />
          <Tooltip content={tooltipContent} />
          {annotations?.map((a) => (
            <ReferenceLine
              key={`${a.timestamp}-${a.message}`}
              x={a.timestamp}
              stroke={ANNOTATION_COLORS[a.type]}
              strokeDasharray="4 4"
              strokeWidth={1.5}
            />
          ))}
          {lines.map((line, index) => (
            <Line
              key={line}
              type="monotone"
              dataKey={line}
              stroke={colors[index % colors.length]}
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5, stroke: "#fff", strokeWidth: 1.5 }}
              connectNulls={true}
              name={line}
            />
          ))}
          {annotations && annotations.length > 0 && (
            <Line
              dataKey="_annotations"
              stroke="transparent"
              strokeWidth={0}
              dot={{ r: 3, fill: "#9ca3af", stroke: "#1a1a2e", strokeWidth: 1 }}
              activeDot={{ r: 5, fill: "#f3f4f6", stroke: "#1a1a2e", strokeWidth: 1.5 }}
              isAnimationActive={false}
              name=""
            />
          )}
        </LineChart>
      </ResponsiveContainer>
      {showLegend && legendPayload.length > 0 && (
        <S.LegendTable>
          <S.LegendHeader>
            <S.LegendCell flex={3}>Seri</S.LegendCell>
            <S.LegendCell flex={1} align="right">Son</S.LegendCell>
            <S.LegendCell flex={1} align="right">Min</S.LegendCell>
            <S.LegendCell flex={1} align="right">Max</S.LegendCell>
            <S.LegendCell flex={1} align="right">Ort</S.LegendCell>
          </S.LegendHeader>
          {legendPayload.map((entry) => {
            const stats = legendStats[entry.dataKey];
            return (
              <S.LegendRow key={entry.dataKey}>
                <S.LegendCell flex={3}>
                  <S.LegendColor style={{ background: entry.color }} />
                  {entry.value}
                </S.LegendCell>
                <S.LegendCell flex={1} align="right">
                  {stats ? formatStat(stats.last) : "-"}
                </S.LegendCell>
                <S.LegendCell flex={1} align="right">
                  {stats ? formatStat(stats.min) : "-"}
                </S.LegendCell>
                <S.LegendCell flex={1} align="right">
                  {stats ? formatStat(stats.max) : "-"}
                </S.LegendCell>
                <S.LegendCell flex={1} align="right">
                  {stats ? formatStat(stats.avg) : "-"}
                </S.LegendCell>
              </S.LegendRow>
            );
          })}
        </S.LegendTable>
      )}
    </S.Container>
  );
};