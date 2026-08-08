import React, { useEffect, useMemo, useRef, useState } from "react";
import { MultiLineChartV2 } from "../MultiLineChartV2";
import type { MultiLineChartLabels } from "../MultiLineChartV2/MultiLineChartV2.types";
import type { TelemetryChartProps, TelemetryChartLabels } from "../TelemetryChart/TelemetryChart.types";
import * as S from "../TelemetryChart/TelemetryChart.styles";
import type { ChartDataPoint } from "../../types";

const DEFAULT_TR: TelemetryChartLabels = {
  range1m: "Son 1 Dakika", range1h: "Son 1 Saat", range1d: "Son 1 Gün",
  range1w: "Son 1 Hafta", range1M: "Son 1 Ay", range3M: "Son 3 Ay",
  range6M: "Son 6 Ay", range1y: "Son 1 Yıl",
  rangeCustom: "Özel Aralık", rangeFrom: "Başlangıç", rangeTo: "Bitiş",
  pointsLow: "60 (Düşük)", pointsStandard: "120 (Standart)",
  pointsHigh: "240 (Yüksek)", pointsMax: "500 (Ultra)",
  timeRange: "Zaman Aralığı", points: "Nokta", metric: "Metrik",
  all: "Tümü", none: "Hiçbiri", selected: "{count} seçili",
  systemEvents: "Sistem Olayları", userActions: "Kullanıcı Hareketleri",
  correctedEvents: "Düzeltilmiş Olaylar", loadFailed: "Veri yüklenirken hata oluştu",
  pointsUnit: "nokta", intervalPrefix: "~",
  seconds: "sn", minutes: "dk", hours: "sa", days: "g",
  onlyEssential: "Sadece Temel", onlyDetail: "Sadece Detay",
  categoryEssential: "Temel Metrikler", categoryDetail: "Diğer Metrikler",
  searchPlaceholder: "Metrik ara...", noResults: "Sonuç bulunamadı",
};

const LEGEND_TR: MultiLineChartLabels = {
  series: "Seri", last: "Son", min: "Min", max: "Max", avg: "Ort",
  noData: "Henüz veri yok...",
};

const RANGE_KEY: Record<string, keyof TelemetryChartLabels> = {
  "1m": "range1m", "1h": "range1h", "1d": "range1d", "1w": "range1w",
  "1M": "range1M", "3M": "range3M", "6M": "range6M", "1y": "range1y",
  custom: "rangeCustom",
};

const POINTS_VALUES = [60, 120, 240, 500] as const;
const POINTS_KEY: Record<number, keyof TelemetryChartLabels> = {
  60: "pointsLow", 120: "pointsStandard", 240: "pointsHigh", 500: "pointsMax",
};

const formatDate = (d: Date, locale: string): string =>
  d.toLocaleString(locale, { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" });

const formatTimeShort = (d: Date, locale: string): string =>
  d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });

const formatDateShort = (d: Date): string => {
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}`;
};

const formatInterval = (ms: number, L: TelemetryChartLabels): string => {
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}${L.seconds}`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}${L.minutes}`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}${L.hours}`;
  const days = Math.round(hours / 24);
  return `${days}${L.days}`;
};

const resolve = (template: string, params: Record<string, string | number>): string =>
  template.replace(/\{(\w+)\}/g, (_m, key) => String(params[key] ?? `{${key}}`));

const buildSubtitle = (
  chartData: ChartDataPoint[], range: string, points: number,
  L: TelemetryChartLabels, locale: string,
): string | null => {
  if (chartData.length < 2) return null;
  const first = new Date(chartData[0].timestamp);
  const last = new Date(chartData[chartData.length - 1].timestamp);
  const spanMs = last.getTime() - first.getTime();
  const spanHours = spanMs / (1000 * 60 * 60);
  const intervalMs = new Date(chartData[1].timestamp).getTime() - new Date(chartData[0].timestamp).getTime();
  const intervalLabel = formatInterval(intervalMs, L);
  let timePart: string;
  if (spanHours <= 2) timePart = `${formatDate(first, locale)} — ${formatTimeShort(last, locale)}`;
  else if (spanHours <= 48) timePart = `${formatTimeShort(first, locale)} — ${formatTimeShort(last, locale)}`;
  else if (spanHours <= 720) timePart = `${formatDateShort(first)} ${formatTimeShort(first, locale)} — ${formatDateShort(last)} ${formatTimeShort(last, locale)}`;
  else timePart = `${formatDateShort(first)} — ${formatDateShort(last)}`;
  const rangeLabel = range === "custom" ? L.rangeCustom : L[RANGE_KEY[range] ?? "range1h"];
  const ptsText = resolve(L.pointsUnit, { count: points });
  return `${timePart} · ${rangeLabel} · ${points} ${ptsText} · ${L.intervalPrefix}${intervalLabel}`;
};

export const SingleTelemetryChart: React.FC<TelemetryChartProps> = ({
  provider, telemetryNames, title, yAxisLabel, height = 320, colors,
  showLegend = true, tagFilters, eventAnnotations,
  labels: rawLabels, locale: rawLocale = "tr",
  defaultMetric, defaultTagSelections,
}) => {
  const L = rawLabels ?? DEFAULT_TR;
  const locale = rawLocale;
  const { data: telemetries, isLoading, isError, error, range, points, setRange, setPoints, customFrom, customTo, setCustomRange } = provider;

  // Single metric select
  const [selectedMetric, setSelectedMetric] = useState<string>(defaultMetric ?? telemetryNames[0] ?? "");

  // Multi tag select
  const [selectedTags, setSelectedTags] = useState<Record<string, string[]>>(defaultTagSelections ?? {});

  const [metricsOpen, setMetricsOpen] = useState(false);
  const [rangeOpen, setRangeOpen] = useState(false);
  const [pointsOpen, setPointsOpen] = useState(false);
  const [tagsOpen, setTagsOpen] = useState<Record<string, boolean>>({});
  const [metricSearch, setMetricSearch] = useState("");
  const metricsRef = useRef<HTMLDivElement>(null);
  const rangeRef = useRef<HTMLDivElement>(null);
  const pointsRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [showSystemEvents, setShowSystemEvents] = useState(false);
  const [showUserEvents, setShowUserEvents] = useState(false);
  const [showFixed, setShowFixed] = useState(false);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (metricsRef.current && !metricsRef.current.contains(e.target as Node)) { setMetricsOpen(false); setMetricSearch(""); }
      if (rangeRef.current && !rangeRef.current.contains(e.target as Node)) { setRangeOpen(false); }
      if (pointsRef.current && !pointsRef.current.contains(e.target as Node)) { setPointsOpen(false); }
      if (controlsRef.current && !controlsRef.current.contains(e.target as Node)) { setTagsOpen({}); }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const metricLabel = selectedMetric || L.none;

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

  const toggleTag = (tagKey: string, value: string) => {
    setSelectedTags((prev) => {
      const current = prev[tagKey] ?? [];
      if (current.includes(value)) {
        return { ...prev, [tagKey]: current.filter((v) => v !== value) };
      }
      return { ...prev, [tagKey]: [...current, value] };
    });
  };

  // Etiket kombinasyonlarindan dogru chartData sutun adlari olustur
  const { seriesNames, sigMap } = useMemo(() => {
    if (!tagFilters || tagFilters.length === 0) {
      const names = selectedMetric ? [selectedMetric] : [];
      const map = new Map<string, string>();
      if (selectedMetric) map.set("", selectedMetric);
      return { seriesNames: names, sigMap: map };
    }
    const activeFilters = tagFilters.filter((f) => (selectedTags[f.tagKey]?.length ?? 0) > 0);
    const sigMap = new Map<string, string>();

    if (activeFilters.length === 0) {
      const names = selectedMetric ? [selectedMetric] : [];
      if (selectedMetric) sigMap.set("", selectedMetric);
      return { seriesNames: names, sigMap };
    }

    const names: string[] = [];

    function build(idx: number, parts: string[], sigParts: string[]) {
      if (idx >= activeFilters.length) {
        const label = parts.join(" / ");
        const name = `${selectedMetric || "—"} (${label})`;
        const sig = sigParts.join("|");
        names.push(name);
        sigMap.set(sig, name);
        return;
      }
      const f = activeFilters[idx]!;
      for (const val of selectedTags[f.tagKey] ?? []) {
        build(idx + 1, [...parts, `${f.tagKey}:${val}`], [...sigParts, val]);
      }
    }
    build(0, [], []);
    return { seriesNames: names, sigMap };
  }, [tagFilters, selectedTags, selectedMetric]);

  const chartData = useMemo(() => {
    if (telemetries.length === 0 || seriesNames.length === 0) return [];
    const hasTagFilters = tagFilters && tagFilters.length > 0;
    const timeMap = new Map<string, ChartDataPoint>();
    for (const telemetry of telemetries) {
      if (telemetry.tags?.variant !== undefined) continue;
      const aggTag = telemetry.tags?.aggregation;
      if (aggTag !== undefined && aggTag !== "avg") continue;
      if (telemetry.name !== selectedMetric) continue;

      if (hasTagFilters && sigMap.size > 0) {
        const sig = (tagFilters ?? []).map((f) => telemetry.tags?.[f.tagKey] ?? "").join("|");
        const colName = sigMap.get(sig);
        if (!colName) continue;
        if (!timeMap.has(telemetry.timestamp)) timeMap.set(telemetry.timestamp, { timestamp: telemetry.timestamp });
        (timeMap.get(telemetry.timestamp)! as any)[colName] = telemetry.value;
      } else {
        if (!timeMap.has(telemetry.timestamp)) timeMap.set(telemetry.timestamp, { timestamp: telemetry.timestamp });
        (timeMap.get(telemetry.timestamp)! as any)[selectedMetric] = telemetry.value;
      }
    }
    return Array.from(timeMap.values()).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }, [telemetries, seriesNames, sigMap, selectedMetric, tagFilters]);

  const filteredAnnotations = useMemo(() => {
    if (!eventAnnotations?.annotations) return [];
    return eventAnnotations.annotations.filter((a) => {
      if (a.fixed && !showFixed) return false;
      if (a.source === "system" && showSystemEvents) return true;
      if (a.source === "user" && showUserEvents) return true;
      return false;
    });
  }, [eventAnnotations, showSystemEvents, showUserEvents, showFixed]);

  const subtitle = useMemo(() => buildSubtitle(chartData, range, points, L, locale), [chartData, range, points, L, locale]);

  if (isLoading) return <S.Container><S.Skeleton style={{ height: `${height + 80}px` }} /></S.Container>;
  if (isError) return <S.Container><S.ErrorBox><S.ErrorTitle>{L.loadFailed}</S.ErrorTitle>{error?.message && <S.ErrorDetail>{error.message}</S.ErrorDetail>}</S.ErrorBox></S.Container>;
  if (telemetries.length === 0) return <S.Container><S.Skeleton style={{ height: `${height + 80}px` }} /></S.Container>;

  return (
    <S.Container>
      <S.Header>
        <S.HeaderRow>
          <S.HeaderTitleGroup>
            <S.HeaderTitle>{title}</S.HeaderTitle>
            {subtitle && <S.HeaderSubtitle>{subtitle}</S.HeaderSubtitle>}
          </S.HeaderTitleGroup>
          {eventAnnotations && (
            <S.HeaderAnnotations>
              <S.HeaderAnnotationGroup><S.Checkbox type="checkbox" checked={showSystemEvents} onChange={() => setShowSystemEvents((v) => !v)} />{L.systemEvents}</S.HeaderAnnotationGroup>
              <S.HeaderAnnotationGroup><S.Checkbox type="checkbox" checked={showUserEvents} onChange={() => setShowUserEvents((v) => !v)} />{L.userActions}</S.HeaderAnnotationGroup>
              <S.HeaderAnnotationGroup><S.Checkbox type="checkbox" checked={showFixed} onChange={() => setShowFixed((v) => !v)} />{L.correctedEvents}</S.HeaderAnnotationGroup>
            </S.HeaderAnnotations>
          )}
        </S.HeaderRow>

        <S.Controls ref={controlsRef}>
          <S.ControlGroup ref={rangeRef}>
            <S.ControlLabel>{L.timeRange}</S.ControlLabel>
            <S.DropdownWrapper>
              <S.DropdownTrigger onClick={() => setRangeOpen((v) => !v)}>{L[RANGE_KEY[range] ?? "range1h"]} ▾</S.DropdownTrigger>
              {rangeOpen && (
                <S.DropdownMenu>
                  {Object.entries(RANGE_KEY).map(([value, key]) => (
                    <S.DropdownItem key={value} onClick={() => { setRange(value as any); setRangeOpen(false); }} style={{ fontWeight: value === range ? 600 : 400 }}>{L[key]}</S.DropdownItem>
                  ))}
                </S.DropdownMenu>
              )}
            </S.DropdownWrapper>
          </S.ControlGroup>

          {range === "custom" && (
            <S.CustomRangeRow>
              <S.DateTimeInput type="datetime-local" value={customFrom?.slice(0, 16) ?? ""} onChange={(e) => { if (e.target.value && setCustomRange) setCustomRange(new Date(e.target.value).toISOString(), customTo ?? new Date().toISOString()); }} />
              <S.DateTimeInput type="datetime-local" value={customTo?.slice(0, 16) ?? ""} onChange={(e) => { if (e.target.value && setCustomRange) setCustomRange(customFrom ?? new Date(Date.now() - 3600000).toISOString(), new Date(e.target.value).toISOString()); }} />
            </S.CustomRangeRow>
          )}

          <S.ControlGroup ref={pointsRef}>
            <S.ControlLabel>{L.points}</S.ControlLabel>
            <S.DropdownWrapper>
              <S.DropdownTrigger onClick={() => setPointsOpen((v) => !v)}>{L[POINTS_KEY[points] ?? "pointsStandard"]} ▾</S.DropdownTrigger>
              {pointsOpen && (
                <S.DropdownMenu>
                  {POINTS_VALUES.map((value) => (
                    <S.DropdownItem key={value} onClick={() => { setPoints(value); setPointsOpen(false); }} style={{ fontWeight: value === points ? 600 : 400 }}>{L[POINTS_KEY[value]]}</S.DropdownItem>
                  ))}
                </S.DropdownMenu>
              )}
            </S.DropdownWrapper>
          </S.ControlGroup>

          {/* Single-select metric dropdown */}
          <S.ControlGroup ref={metricsRef}>
            <S.ControlLabel>{L.metric}</S.ControlLabel>
            <S.DropdownWrapper>
              <S.DropdownTrigger onClick={() => setMetricsOpen((v) => !v)}>{metricLabel} ▾</S.DropdownTrigger>
              {metricsOpen && (
                <S.DropdownMenu>
                  <div style={{ padding: "6px 8px" }}>
                    <S.SearchInput ref={searchInputRef} placeholder={L.searchPlaceholder} value={metricSearch} onChange={(e) => setMetricSearch(e.target.value)} onKeyDown={(e) => e.stopPropagation()} />
                  </div>
                  {(metricSearch ? telemetryNames.filter((n) => n.toLowerCase().includes(metricSearch.toLowerCase())) : telemetryNames).map((name) => {
                    const isSelected = selectedMetric === name;
                    return (
                      <S.DropdownItem key={name} onClick={() => { setSelectedMetric(name); setMetricsOpen(false); setMetricSearch(""); }} style={{ fontWeight: isSelected ? 600 : 400 }}>
                        <span style={{ display: "inline-block", width: 14, fontSize: 11, color: isSelected ? "#60a5fa" : "transparent" }}>{isSelected ? "●" : "○"}</span>{" "}{name}
                      </S.DropdownItem>
                    );
                  })}
                </S.DropdownMenu>
              )}
            </S.DropdownWrapper>
          </S.ControlGroup>

          {/* Multi-select tag filters */}
          {tagFilters?.map((filter) => {
            const selected = selectedTags[filter.tagKey] ?? [];
            const open = tagsOpen[filter.tagKey] ?? false;
            const label = selected.length > 0 ? resolve(L.selected, { count: selected.length }) : "—";
            return (
              <S.ControlGroup key={filter.tagKey}>
                <S.ControlLabel>{filter.label}</S.ControlLabel>
                <S.DropdownWrapper>
                  <S.DropdownTrigger onClick={() => setTagsOpen((prev) => ({ ...prev, [filter.tagKey]: !prev[filter.tagKey] }))}>{label} ▾</S.DropdownTrigger>
                  {open && (
                    <S.DropdownMenu>
                      {(tagOptions[filter.tagKey] || []).map((v) => {
                        const checked = selected.includes(v);
                        return (
                          <S.DropdownItem key={v}>
                            <S.Checkbox type="checkbox" checked={checked} onChange={() => toggleTag(filter.tagKey, v)} />{v}
                          </S.DropdownItem>
                        );
                      })}
                    </S.DropdownMenu>
                  )}
                </S.DropdownWrapper>
              </S.ControlGroup>
            );
          })}
        </S.Controls>
      </S.Header>

      <MultiLineChartV2 data={chartData} yAxisLabel={yAxisLabel} height={height} colors={colors} showLegend={showLegend} annotations={filteredAnnotations} labels={LEGEND_TR} locale={locale} />
    </S.Container>
  );
};

SingleTelemetryChart.displayName = "SingleTelemetryChart";
