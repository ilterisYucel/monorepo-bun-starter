// packages/ui/src/components/TelemetryChart/TelemetryChart.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { MultiLineChart } from "../MultiLineChart";
import type { TelemetryChartProps } from "./TelemetryChart.types";
import type { EventAnnotation } from "../../interfaces/event-annotations";
import * as S from "./TelemetryChart.styles";
import type { ChartDataPoint } from "../../types";

const formatDate = (d: Date): string =>
  d.toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

const formatTimeShort = (d: Date): string =>
  d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });

const formatDateShort = (d: Date): string => {
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}`;
};

const formatInterval = (ms: number): string => {
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}sn`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}dk`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}sa`;
  const days = Math.round(hours / 24);
  return `${days}g`;
};

const getRangeLabel = (range: string): string => {
  switch (range) {
    case "1m": return "Son 1 Dakika";
    case "1h": return "Son 1 Saat";
    case "1d": return "Son 1 Gün";
    case "1w": return "Son 1 Hafta";
    case "1M": return "Son 1 Ay";
    case "3M": return "Son 3 Ay";
    case "6M": return "Son 6 Ay";
    case "1y": return "Son 1 Yıl";
    default: return "Son 1 Saat";
  }
};

const buildSubtitle = (chartData: ChartDataPoint[], range: string, points: number): string | null => {
  if (chartData.length < 2) return null;
  const first = new Date(chartData[0].timestamp);
  const last = new Date(chartData[chartData.length - 1].timestamp);
  const spanMs = last.getTime() - first.getTime();
  const spanHours = spanMs / (1000 * 60 * 60);

  const intervalMs = new Date(chartData[1].timestamp).getTime() - new Date(chartData[0].timestamp).getTime();
  const intervalLabel = formatInterval(intervalMs);

  let timePart: string;
  if (spanHours <= 2) {
    timePart = `${formatDate(first)} — ${formatTimeShort(last)}`;
  } else if (spanHours <= 48) {
    timePart = `${formatTimeShort(first)} — ${formatTimeShort(last)}`;
  } else if (spanHours <= 720) {
    timePart = `${formatDateShort(first)} ${formatTimeShort(first)} — ${formatDateShort(last)} ${formatTimeShort(last)}`;
  } else {
    timePart = `${formatDateShort(first)} — ${formatDateShort(last)}`;
  }

  return `${timePart} · ${getRangeLabel(range)} · ${points} nokta · ~${intervalLabel} aralık`;
};

export const TelemetryChart: React.FC<TelemetryChartProps> = ({
  provider,
  telemetryNames,
  title,
  yAxisLabel,
  height = 320,
  colors,
  showLegend = true,
  tagFilters,
  eventAnnotations,
}) => {
  const {
    data: telemetries,
    isLoading,
    isError,
    error,
    range,
    points,
    setRange,
    setPoints,
  } = provider;

  const [selectedTags, setSelectedTags] = useState<Record<string, string>>({});
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(telemetryNames);
  const [metricsOpen, setMetricsOpen] = useState(false);
  const metricsRef = useRef<HTMLDivElement>(null);
  const [showSystemEvents, setShowSystemEvents] = useState(false);
  const [showUserEvents, setShowUserEvents] = useState(false);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (metricsRef.current && !metricsRef.current.contains(e.target as Node)) {
        setMetricsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const allMetricsSelected = selectedMetrics.length === telemetryNames.length;

  const toggleAllMetrics = () => {
    setSelectedMetrics(allMetricsSelected ? [] : [...telemetryNames]);
  };

  const toggleMetric = (name: string) => {
    setSelectedMetrics((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name],
    );
  };

  const metricLabel = allMetricsSelected
    ? "Tümü"
    : selectedMetrics.length === 0
      ? "Hiçbiri"
      : `${selectedMetrics.length} seçili`;

  const tagOptions = useMemo(() => {
    if (!tagFilters || telemetries.length === 0) return {};
    const options: Record<string, string[]> = {};
    for (const filter of tagFilters) {
      const values = new Set<string>();
      for (const d of telemetries) {
        const v = d.tags?.[filter.tagKey];
        if (v) values.add(v);
      }
      options[filter.tagKey] = [...values].sort();
    }
    return options;
  }, [tagFilters, telemetries]);

  useEffect(() => {
    if (!tagFilters || Object.keys(tagOptions).length === 0) return;
    if (Object.keys(selectedTags).length > 0) return;
    const initial: Record<string, string> = {};
    for (const filter of tagFilters) {
      const first = tagOptions[filter.tagKey]?.[0];
      if (first) initial[filter.tagKey] = first;
    }
    if (Object.keys(initial).length > 0) setSelectedTags(initial);
  }, [tagFilters, tagOptions, selectedTags]);

  const chartData = useMemo(() => {
    if (telemetries.length === 0) return [];
    const timeMap = new Map<string, ChartDataPoint>();
    for (const telemetry of telemetries) {
      const timestamp = telemetry.timestamp;
      const name = telemetry.name;
      const value = telemetry.value as number;
      if (!selectedMetrics.includes(name)) continue;

      if (tagFilters) {
        let skip = false;
        for (const filter of tagFilters) {
          const selected = selectedTags[filter.tagKey];
          if (selected && telemetry.tags?.[filter.tagKey] !== selected) {
            skip = true;
            break;
          }
        }
        if (skip) continue;
      }

      if (!timeMap.has(timestamp)) timeMap.set(timestamp, { timestamp });
      const point = timeMap.get(timestamp)!;
      point[name] = value;
    }
    return Array.from(timeMap.values()).sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );
  }, [telemetries, selectedMetrics, tagFilters, selectedTags]);

  const filteredAnnotations = useMemo(() => {
    if (!eventAnnotations?.annotations) return [];
    return eventAnnotations.annotations.filter((a) => {
      if (a.category === "system" && showSystemEvents) return true;
      if (a.category === "user" && showUserEvents) return true;
      return false;
    });
  }, [eventAnnotations, showSystemEvents, showUserEvents]);

  const chartDataWithAnnotations = useMemo(() => {
    if (filteredAnnotations.length === 0) return chartData;
    const extraTimestamps = new Set(filteredAnnotations.map((a) => a.timestamp));
    const merged = [...chartData];
    for (const ts of extraTimestamps) {
      if (!chartData.some((d) => d.timestamp === ts)) {
        merged.push({ timestamp: ts, _annotations: 1 } as ChartDataPoint);
      }
    }
    return merged.sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );
  }, [chartData, filteredAnnotations]);

  const subtitle = useMemo(
    () => buildSubtitle(chartData, range, points),
    [chartData, range, points],
  );

  if (isLoading) {
    return (
      <S.Container>
        <S.Skeleton style={{ height: `${height + 80}px` }} />
      </S.Container>
    );
  }

  if (isError) {
    return (
      <S.Container>
        <S.ErrorBox>
          <S.ErrorTitle>Veri yüklenirken hata oluştu</S.ErrorTitle>
          {error?.message && <S.ErrorDetail>{error.message}</S.ErrorDetail>}
        </S.ErrorBox>
      </S.Container>
    );
  }

  return (
    <S.Container>
      <S.Header>
        <S.HeaderRow>
          <S.HeaderTitleGroup>
            <S.HeaderTitle>{title}</S.HeaderTitle>
            {subtitle && <S.HeaderSubtitle>{subtitle}</S.HeaderSubtitle>}
          </S.HeaderTitleGroup>
        </S.HeaderRow>

        <S.Controls>
          <S.ControlGroup>
            <S.ControlLabel>Zaman Aralığı</S.ControlLabel>
            <S.ControlSelect
              value={range}
              onChange={(e) => setRange(e.target.value as any)}
            >
              <option value="1m">Son 1 Dakika</option>
              <option value="1h">Son 1 Saat</option>
              <option value="1d">Son 1 Gün</option>
              <option value="1w">Son 1 Hafta</option>
              <option value="1M">Son 1 Ay</option>
              <option value="3M">Son 3 Ay</option>
              <option value="6M">Son 6 Ay</option>
              <option value="1y">Son 1 Yıl</option>
            </S.ControlSelect>
          </S.ControlGroup>

          <S.ControlGroup>
            <S.ControlLabel>Nokta</S.ControlLabel>
            <S.ControlSelect
              value={points}
              onChange={(e) => setPoints(Number(e.target.value))}
            >
              <option value={60}>60 (Düşük)</option>
              <option value={120}>120 (Standart)</option>
              <option value={240}>240 (Yüksek)</option>
              <option value={500}>500 (Ultra)</option>
            </S.ControlSelect>
          </S.ControlGroup>

          <S.ControlGroup ref={metricsRef}>
            <S.ControlLabel>Metrik</S.ControlLabel>
            <S.DropdownWrapper>
              <S.DropdownTrigger onClick={() => setMetricsOpen((v) => !v)}>
                {metricLabel} ▾
              </S.DropdownTrigger>
              {metricsOpen && (
                <S.DropdownMenu>
                  <S.DropdownItem>
                    <S.Checkbox
                      type="checkbox"
                      checked={allMetricsSelected}
                      onChange={toggleAllMetrics}
                    />
                    Tümü
                  </S.DropdownItem>
                  <S.DropdownDivider />
                  {telemetryNames.map((name) => (
                    <S.DropdownItem key={name}>
                      <S.Checkbox
                        type="checkbox"
                        checked={selectedMetrics.includes(name)}
                        onChange={() => toggleMetric(name)}
                      />
                      {name}
                    </S.DropdownItem>
                  ))}
                </S.DropdownMenu>
              )}
            </S.DropdownWrapper>
          </S.ControlGroup>

          {eventAnnotations && (
            <>
              <S.ControlGroup>
                <S.ControlLabel>Sistem Olayları</S.ControlLabel>
                <S.Checkbox
                  type="checkbox"
                  checked={showSystemEvents}
                  onChange={() => setShowSystemEvents((v) => !v)}
                />
              </S.ControlGroup>
              <S.ControlGroup>
                <S.ControlLabel>Kullanıcı Hareketleri</S.ControlLabel>
                <S.Checkbox
                  type="checkbox"
                  checked={showUserEvents}
                  onChange={() => setShowUserEvents((v) => !v)}
                />
              </S.ControlGroup>
            </>
          )}

          {tagFilters?.map((filter) => (
            <S.ControlGroup key={filter.tagKey}>
              <S.ControlLabel>{filter.label}</S.ControlLabel>
              <S.ControlSelect
                value={selectedTags[filter.tagKey] || (tagOptions[filter.tagKey]?.[0] ?? "")}
                onChange={(e) =>
                  setSelectedTags((prev) => ({
                    ...prev,
                    [filter.tagKey]: e.target.value,
                  }))
                }
              >
                {(tagOptions[filter.tagKey] || []).map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </S.ControlSelect>
            </S.ControlGroup>
          ))}
        </S.Controls>
      </S.Header>

      <MultiLineChart
        data={chartDataWithAnnotations}
        yAxisLabel={yAxisLabel}
        height={height}
        colors={colors}
        showLegend={showLegend}
        annotations={filteredAnnotations}
      />
    </S.Container>
  );
};