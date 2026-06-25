import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import uPlot from "uplot";
import "uplot/dist/uPlot.min.css";
import type { MultiLineChartProps } from "./MultiLineChartV2.types";
import type { LogEntry } from "@gd-monorepo/shared-types";
import * as S from "./MultiLineChartV2.styles";

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
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
};

const formatStat = (v: number | string): string => {
  if (typeof v === "string") return v;
  return v.toLocaleString("tr-TR", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
};

const formatTooltipVal = (v: number | string): string => {
  if (typeof v === "number") {
    return v.toLocaleString("tr-TR", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }
  return String(v);
};

interface SeriesStats {
  last: number; min: number; max: number; avg: number;
}

interface TooltipState {
  idx: number;
  left: number;
  top: number;
  cursorTs: number;
  annotLeft?: number;
}

export const MultiLineChartV2: React.FC<MultiLineChartProps> = ({
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
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<uPlot | null>(null);
  const annotationsRef = useRef<LogEntry[] | undefined>(annotations);
  annotationsRef.current = annotations;
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const sortedData = useMemo(() => {
    return [...data].sort((a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );
  }, [data]);

  const lines = useMemo(() => {
    if (data.length === 0) return [];
    const first = data[0];
    return Object.keys(first as any).filter(
      (k) => k !== "timestamp" && !k.startsWith("_"),
    );
  }, [data]);

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
        last: values[values.length - 1]!,
        min: Math.min(...values),
        max: Math.max(...values),
        avg: sum / values.length,
      };
    }
    return result;
  }, [sortedData, lines]);

  const uplotData = useMemo((): uPlot.AlignedData | null => {
    if (sortedData.length === 0 || lines.length === 0) return null;
    const timestamps = sortedData.map((d) => new Date(d.timestamp).getTime() / 1000);
    const series: (number | null)[][] = lines.map((key) =>
      sortedData.map((d) => {
        const v = (d as any)[key];
        return typeof v === "number" ? v : null;
      }),
    );
    return [timestamps, ...series] as uPlot.AlignedData;
  }, [sortedData, lines]);

  const getChartHeight = useCallback((): number => {
    if (!containerRef.current) return height;
    return containerRef.current.getBoundingClientRect().height || height;
  }, [height]);

  useEffect(() => {
    if (!containerRef.current || !uplotData || lines.length === 0) {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
      return;
    }

    const seriesOpts: uPlot.Series[] = [
      {},
      ...lines.map((key) => ({
        label: key,
        stroke: colors[(lines.indexOf(key)) % colors.length],
        width: 2.5,
        spanGaps: true,
      })),
    ];

    const opts: uPlot.Options = {
      width: containerRef.current.getBoundingClientRect().width || 800,
      height: getChartHeight(),
      ms: 1e-3,
      series: seriesOpts,
      legend: { show: false },
      cursor: {
        show: true,
        x: true,
        y: false,
        drag: { x: true, y: false, setScale: false },
        points: { show: true, size: 5, width: 1.5 },
      },
      axes: [
        {
          stroke: "#9ca3af",
          grid: { show: true, stroke: "#252535", width: 1 },
          ticks: { show: false },
          font: "11px monospace",
        },
        {
          stroke: "#9ca3af",
          grid: { show: true, stroke: "#252535", width: 1 },
          ticks: { show: false },
          font: "11px monospace",
          label: yAxisLabel,
          labelFont: "12px monospace",
          labelSize: 40,
          size: 60,
        },
      ],
      scales: {
        x: { time: true },
        y: { auto: true },
      },
      hooks: {
        draw: [
          (u) => {
            const annots = annotationsRef.current;
            if (!annots || annots.length === 0) return;

            const ctx = u.ctx;
            const bbox = u.bbox;
            const xScaleKey = u.scales.x?.key ?? "x";

            for (const a of annots) {
              const ts = new Date(a.timestamp).getTime() / 1000;
              const x = u.valToPos(ts, xScaleKey);
              if (x < bbox.left || x > bbox.left + bbox.width) continue;

              ctx.save();
              ctx.beginPath();
              ctx.setLineDash([4, 4]);
              ctx.strokeStyle = ANNOTATION_COLORS[a.type];
              ctx.lineWidth = 1.5;
              ctx.moveTo(x, bbox.top);
              ctx.lineTo(x, bbox.top + bbox.height);
              ctx.stroke();

              // dot at middle
              ctx.beginPath();
              ctx.setLineDash([]);
              ctx.arc(x, bbox.top + bbox.height / 2, 3, 0, Math.PI * 2);
              ctx.fillStyle = "#9ca3af";
              ctx.strokeStyle = "#1a1a2e";
              ctx.lineWidth = 1;
              ctx.fill();
              ctx.stroke();

              ctx.restore();
            }
          },
        ],
        setCursor: [
          (u) => {
            if (
              u.cursor.idx == null ||
              u.cursor.idx < 0 ||
              u.cursor.left == null ||
              u.cursor.top == null
            ) {
              setTooltip(null);
              return;
            }

            const cursorTs = u.posToVal(u.cursor.left, "x");

            let annotLeft: number | undefined;
            const annots = annotationsRef.current;
            if (annots && annots.length > 0) {
              const cursorMs = cursorTs * 1000;
              const dataRange =
                sortedData.length > 1
                  ? new Date(sortedData[sortedData.length - 1]!.timestamp).getTime() -
                    new Date(sortedData[0]!.timestamp).getTime()
                  : 60000;
              const threshold = Math.max(2000, dataRange * 0.03);

              let closest: LogEntry | null = null;
              let closestDist = Infinity;
              for (const a of annots) {
                const d = Math.abs(new Date(a.timestamp).getTime() - cursorMs);
                if (d < closestDist) { closest = a; closestDist = d; }
              }
              if (closest && closestDist <= threshold) {
                annotLeft = u.valToPos(new Date(closest.timestamp).getTime() / 1000, "x");
              }
            }

            setTooltip({
              idx: u.cursor.idx,
              left: u.cursor.left,
              top: u.cursor.top,
              cursorTs,
              annotLeft,
            });
          },
        ],
      },
    };

    if (chartRef.current) {
      chartRef.current.setData(uplotData);
    } else {
      chartRef.current = new uPlot(opts, uplotData, containerRef.current);
    }

    return () => {
      // cleanup handled by ResizeObserver effect
    };
  }, [uplotData, lines, colors, getChartHeight, yAxisLabel]);

  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.redraw(false, false);
    }
  }, [annotations]);

  // responsive resize
  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    let raf: number;
    const observer = new ResizeObserver(() => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        if (chartRef.current && el) {
          const rect = el.getBoundingClientRect();
          chartRef.current.setSize({ width: rect.width, height: rect.height });
        }
        raf = 0;
      });
    });
    observer.observe(el);
    return () => {
      observer.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  // cleanup on unmount
  useEffect(() => {
    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, []);

  const tooltipContent = useMemo(() => {
    if (!tooltip) return null;
    const cursorMs = tooltip.cursorTs * 1000;
    const dataPoint = sortedData[tooltip.idx] ?? null;
    const dataDist = dataPoint
      ? Math.abs(new Date(dataPoint.timestamp).getTime() - cursorMs)
      : Infinity;

    const dataRange =
      sortedData.length > 1
        ? new Date(sortedData[sortedData.length - 1]!.timestamp).getTime() -
          new Date(sortedData[0]!.timestamp).getTime()
        : 60000;
    const threshold = Math.max(2000, dataRange * 0.03);

    let closestAnn: LogEntry | null = null;
    let annotDist = Infinity;
    if (annotations) {
      for (const a of annotations) {
        const d = Math.abs(new Date(a.timestamp).getTime() - cursorMs);
        if (d < annotDist) { closestAnn = a; annotDist = d; }
      }
    }
    const showAnnotation = closestAnn && annotDist <= threshold;
    const showTelemetry = dataPoint && dataDist <= annotDist;

    return { dataPoint, showTelemetry, showAnnotation, closestAnn };
  }, [tooltip, sortedData, annotations]);

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
      <div ref={containerRef} style={S.uPlotContainerStyle} />
      {tooltip && tooltipContent && (
        <div
          style={{
            ...S.tooltipStyle,
            left:
              (tooltipContent.showAnnotation &&
                !tooltipContent.showTelemetry &&
                tooltip.annotLeft != null
                ? tooltip.annotLeft
                : tooltip.left) + 10,
            top: tooltip.top - 10,
          }}
        >
          <div style={{ color: "#f3f4f6", fontWeight: 600, marginBottom: 6, fontSize: 12 }}>
            {formatTooltipTime(
              new Date(tooltip.cursorTs * 1000).toISOString(),
            )}
          </div>
          {tooltipContent.showTelemetry && tooltipContent.dataPoint && (
            <>
              <div style={{ height: 1, background: "#2a2a3a", margin: "0 0 6px 0" }} />
              {lines.map((key) => (
                <div key={key} style={{ display: "flex", alignItems: "center", gap: 8, padding: "2px 0" }}>
                  <span style={{
                    display: "inline-block", width: 8, height: 8, borderRadius: "50%",
                    background: colors[lines.indexOf(key) % colors.length], flexShrink: 0,
                  }} />
                  <span style={{ color: "#d1d5db", fontSize: 12, flex: 1 }}>{key}</span>
                  <span style={{ color: "#f3f4f6", fontSize: 12, fontWeight: 600 }}>
                    {formatTooltipVal((tooltipContent.dataPoint as any)[key])}
                  </span>
                </div>
              ))}
            </>
          )}
          {tooltipContent.showAnnotation && tooltipContent.closestAnn && (
            <>
              <div style={{ height: 1, background: "#2a2a3a", margin: "6px 0" }} />
              <div style={{ color: ANNOTATION_COLORS[tooltipContent.closestAnn.type], fontSize: 11, padding: "2px 0", wordWrap: "break-word", whiteSpace: "normal", maxWidth: 220 }}>
                {tooltipContent.closestAnn.type.toUpperCase()}: {tooltipContent.closestAnn.message}
              </div>
            </>
          )}
        </div>
      )}
      {showLegend && lines.length > 0 && (
        <S.LegendTable>
          <S.LegendHeader>
            <S.LegendCell flex={3}>Seri</S.LegendCell>
            <S.LegendCell flex={1} align="right">Son</S.LegendCell>
            <S.LegendCell flex={1} align="right">Min</S.LegendCell>
            <S.LegendCell flex={1} align="right">Max</S.LegendCell>
            <S.LegendCell flex={1} align="right">Ort</S.LegendCell>
          </S.LegendHeader>
          {lines.map((key) => {
            const stats = legendStats[key];
            return (
              <S.LegendRow key={key}>
                <S.LegendCell flex={3}>
                  <S.LegendColor style={{ background: colors[lines.indexOf(key) % colors.length] }} />
                  {key}
                </S.LegendCell>
                <S.LegendCell flex={1} align="right">{stats ? formatStat(stats.last) : "-"}</S.LegendCell>
                <S.LegendCell flex={1} align="right">{stats ? formatStat(stats.min) : "-"}</S.LegendCell>
                <S.LegendCell flex={1} align="right">{stats ? formatStat(stats.max) : "-"}</S.LegendCell>
                <S.LegendCell flex={1} align="right">{stats ? formatStat(stats.avg) : "-"}</S.LegendCell>
              </S.LegendRow>
            );
          })}
        </S.LegendTable>
      )}
    </S.Container>
  );
};
