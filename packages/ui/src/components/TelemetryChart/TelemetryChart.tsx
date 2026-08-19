// packages/ui/src/components/TelemetryChart/TelemetryChart.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { MultiLineChartV2 } from "../MultiLineChartV2";
import type { MultiLineChartLabels } from "../MultiLineChartV2/MultiLineChartV2.types";
import type { TelemetryChartProps, TelemetryChartLabels } from "./TelemetryChart.types";
import * as S from "./TelemetryChart.styles";
import type { ChartDataPoint } from "../../types";

const DEFAULT_TR: TelemetryChartLabels = {
  range1m: "Son 1 Dakika",
  range1h: "Son 1 Saat",
  range1d: "Son 1 Gün",
  range1w: "Son 1 Hafta",
  range1M: "Son 1 Ay",
  range3M: "Son 3 Ay",
  range6M: "Son 6 Ay",
  range1y: "Son 1 Yıl",
  rangeCustom: "Özel Aralık",
  rangeFrom: "Başlangıç",
  rangeTo: "Bitiş",
  pointsLow: "60 (Düşük)",
  pointsStandard: "120 (Standart)",
  pointsHigh: "240 (Yüksek)",
  pointsMax: "500 (Ultra)",
  timeRange: "Zaman Aralığı",
  points: "Nokta",
  metric: "Metrik",
  all: "Tümü",
  none: "Hiçbiri",
  selected: "{count} seçili",
  systemEvents: "Sistem Olayları",
  userActions: "Kullanıcı Hareketleri",
  correctedEvents: "Düzeltilmiş Olaylar",
  loadFailed: "Veri yüklenirken hata oluştu",
  loading: "Yükleniyor...",
  noData: "Henüz veri yok...",
  pointsUnit: "nokta",
  intervalPrefix: "~",
  seconds: "sn",
  minutes: "dk",
  hours: "sa",
  days: "g",
  onlyEssential: "Sadece Temel",
  onlyDetail: "Sadece Detay",
  categoryEssential: "Temel Metrikler",
  categoryDetail: "Diğer Metrikler",
  searchPlaceholder: "Metrik ara...",
  noResults: "Sonuç bulunamadı",
};

const LEGEND_TR: MultiLineChartLabels = {
  series: "Seri",
  last: "Son",
  min: "Min",
  max: "Max",
  avg: "Ort",
  noData: "Henüz veri yok...",
};

const RANGE_KEY: Record<string, keyof TelemetryChartLabels> = {
  "1m": "range1m",
  "1h": "range1h",
  "1d": "range1d",
  "1w": "range1w",
  "1M": "range1M",
  "3M": "range3M",
  "6M": "range6M",
  "1y": "range1y",
  custom: "rangeCustom",
};

const POINTS_VALUES = [60, 120, 240, 500] as const;
const POINTS_KEY: Record<number, keyof TelemetryChartLabels> = {
  60: "pointsLow",
  120: "pointsStandard",
  240: "pointsHigh",
  500: "pointsMax",
};

const formatDate = (d: Date, locale: string): string =>
  d.toLocaleString(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

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
  chartData: ChartDataPoint[],
  range: string,
  points: number,
  L: TelemetryChartLabels,
  locale: string,
): string | null => {
  if (chartData.length < 2) return null;
  const first = new Date(chartData[0].timestamp);
  const last = new Date(chartData[chartData.length - 1].timestamp);
  const spanMs = last.getTime() - first.getTime();
  const spanHours = spanMs / (1000 * 60 * 60);

  const intervalMs =
    new Date(chartData[1].timestamp).getTime() -
    new Date(chartData[0].timestamp).getTime();
  const intervalLabel = formatInterval(intervalMs, L);

  let timePart: string;
  if (spanHours <= 2) {
    timePart = `${formatDate(first, locale)} — ${formatTimeShort(last, locale)}`;
  } else if (spanHours <= 48) {
    timePart = `${formatTimeShort(first, locale)} — ${formatTimeShort(last, locale)}`;
  } else if (spanHours <= 720) {
    timePart = `${formatDateShort(first)} ${formatTimeShort(first, locale)} — ${formatDateShort(last)} ${formatTimeShort(last, locale)}`;
  } else {
    timePart = `${formatDateShort(first)} — ${formatDateShort(last)}`;
  }

  const rangeLabel = range === "custom"
    ? L.rangeCustom
    : L[RANGE_KEY[range] ?? "range1h"];
  const ptsText = resolve(L.pointsUnit, { count: points });

  return `${timePart} · ${rangeLabel} · ${points} ${ptsText} · ${L.intervalPrefix}${intervalLabel}`;
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
  labels: rawLabels,
  locale: rawLocale = "tr",
}) => {
  const L = rawLabels ?? DEFAULT_TR;
  const locale = rawLocale;
  const {
    data: telemetries,
    isLoading,
    isError,
    error,
    range,
    points,
    setRange,
    setPoints,
    customFrom,
    customTo,
    setCustomRange,
  } = provider;

  const [selectedTags, setSelectedTags] = useState<Record<string, string>>({});
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(
    telemetryNames,
  );
  const [metricsOpen, setMetricsOpen] = useState(false);
  const [rangeOpen, setRangeOpen] = useState(false);
  const [pointsOpen, setPointsOpen] = useState(false);
  const metricsRef = useRef<HTMLDivElement>(null);
  const rangeRef = useRef<HTMLDivElement>(null);
  const pointsRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<HTMLDivElement>(null);
  const [showSystemEvents, setShowSystemEvents] = useState(false);
  const [showUserEvents, setShowUserEvents] = useState(false);
  const [showFixed, setShowFixed] = useState(false);
  const [tagsDropdownOpen, setTagsDropdownOpen] = useState<Record<string, boolean>>({});
  const [metricSearch, setMetricSearch] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (metricsRef.current && !metricsRef.current.contains(e.target as Node)) {
        setMetricsOpen(false);
        setMetricSearch("");
      }
      if (rangeRef.current && !rangeRef.current.contains(e.target as Node)) {
        setRangeOpen(false);
      }
      if (pointsRef.current && !pointsRef.current.contains(e.target as Node)) {
        setPointsOpen(false);
      }
      if (controlsRef.current && !controlsRef.current.contains(e.target as Node)) {
        setTagsDropdownOpen({});
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
    ? L.all
    : selectedMetrics.length === 0
      ? L.none
      : resolve(L.selected, { count: selectedMetrics.length });

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
      if (telemetry.tags?.variant !== undefined) continue;
      const aggTag = telemetry.tags?.aggregation;
      if (aggTag !== undefined && aggTag !== "avg") continue;

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
      if (a.fixed && !showFixed) return false;
      if (a.source === "system" && showSystemEvents) return true;
      if (a.source === "user" && showUserEvents) return true;
      return false;
    });
  }, [eventAnnotations, showSystemEvents, showUserEvents, showFixed]);

  const subtitle = useMemo(
    () => buildSubtitle(chartData, range, points, L, locale),
    [chartData, range, points, L, locale],
  );

  if (isError) {
    return (
      <S.Container>
        <S.ErrorBox>
          <S.ErrorTitle>{L.loadFailed}</S.ErrorTitle>
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
          {eventAnnotations && (
            <S.HeaderAnnotations>
              <S.HeaderAnnotationGroup>
                <S.Checkbox
                  type="checkbox"
                  checked={showSystemEvents}
                  onChange={() => setShowSystemEvents((v) => !v)}
                />
                {L.systemEvents}
              </S.HeaderAnnotationGroup>
              <S.HeaderAnnotationGroup>
                <S.Checkbox
                  type="checkbox"
                  checked={showUserEvents}
                  onChange={() => setShowUserEvents((v) => !v)}
                />
                {L.userActions}
              </S.HeaderAnnotationGroup>
              <S.HeaderAnnotationGroup>
                <S.Checkbox
                  type="checkbox"
                  checked={showFixed}
                  onChange={() => setShowFixed((v) => !v)}
                />
                {L.correctedEvents}
              </S.HeaderAnnotationGroup>
            </S.HeaderAnnotations>
          )}
        </S.HeaderRow>

        <S.Controls ref={controlsRef}>
          <S.ControlGroup ref={rangeRef}>
            <S.ControlLabel>{L.timeRange}</S.ControlLabel>
            <S.DropdownWrapper>
              <S.DropdownTrigger onClick={() => setRangeOpen((v) => !v)}>
                {L[RANGE_KEY[range] ?? "range1h"]} ▾
              </S.DropdownTrigger>
              {rangeOpen && (
                <S.DropdownMenu>
                  {Object.entries(RANGE_KEY).map(([value, key]) => (
                    <S.DropdownItem
                      key={value}
                      onClick={() => {
                        setRange(value as any);
                        setRangeOpen(false);
                      }}
                      style={{ fontWeight: value === range ? 600 : 400 }}
                    >
                      {L[key]}
                    </S.DropdownItem>
                  ))}
                </S.DropdownMenu>
              )}
            </S.DropdownWrapper>
          </S.ControlGroup>

          {range === "custom" && (
            <S.CustomRangeRow>
              <S.DateTimeInput
                type="datetime-local"
                value={customFrom?.slice(0, 16) ?? ""}
                onChange={(e) => {
                  if (e.target.value && setCustomRange) {
                    setCustomRange(
                      new Date(e.target.value).toISOString(),
                      customTo ?? new Date().toISOString(),
                    );
                  }
                }}
              />
              <S.DateTimeInput
                type="datetime-local"
                value={customTo?.slice(0, 16) ?? ""}
                onChange={(e) => {
                  if (e.target.value && setCustomRange) {
                    setCustomRange(
                      customFrom ?? new Date(Date.now() - 3600000).toISOString(),
                      new Date(e.target.value).toISOString(),
                    );
                  }
                }}
              />
            </S.CustomRangeRow>
          )}

          <S.ControlGroup ref={pointsRef}>
            <S.ControlLabel>{L.points}</S.ControlLabel>
            <S.DropdownWrapper>
              <S.DropdownTrigger onClick={() => setPointsOpen((v) => !v)}>
                {L[POINTS_KEY[points] ?? "pointsStandard"]} ▾
              </S.DropdownTrigger>
              {pointsOpen && (
                <S.DropdownMenu>
                  {POINTS_VALUES.map((value) => (
                    <S.DropdownItem
                      key={value}
                      onClick={() => {
                        setPoints(value);
                        setPointsOpen(false);
                      }}
                      style={{ fontWeight: value === points ? 600 : 400 }}
                    >
                      {L[POINTS_KEY[value]]}
                    </S.DropdownItem>
                  ))}
                </S.DropdownMenu>
              )}
            </S.DropdownWrapper>
          </S.ControlGroup>

          <S.ControlGroup ref={metricsRef}>
            <S.ControlLabel>{L.metric}</S.ControlLabel>
            <S.DropdownWrapper>
              <S.DropdownTrigger onClick={() => setMetricsOpen((v) => !v)}>
                {metricLabel} ▾
              </S.DropdownTrigger>
              {metricsOpen && (
                <S.DropdownMenu>
                  <div style={{ padding: "6px 8px" }}>
                    <S.SearchInput
                      ref={searchInputRef}
                      placeholder={L.searchPlaceholder}
                      value={metricSearch}
                      onChange={(e) => setMetricSearch(e.target.value)}
                      onKeyDown={(e) => e.stopPropagation()}
                    />
                  </div>
                  <S.DropdownItem>
                    <S.Checkbox
                      type="checkbox"
                      checked={allMetricsSelected}
                      onChange={toggleAllMetrics}
                    />
                    {L.all}
                  </S.DropdownItem>
                  <S.DropdownDivider />
                  {(() => {
                    const lower = metricSearch.toLowerCase();
                    const filtered = metricSearch
                      ? telemetryNames.filter((n) =>
                          n.toLowerCase().includes(lower),
                        )
                      : telemetryNames;

                    const essentialSet = new Set([
                      "SOC", "SOH", "Voltage", "Current",
                      "ChargePower", "DischargePower", "Temperature",
                    ]);

                    const essential = filtered.filter((n) =>
                      essentialSet.has(n),
                    );
                    const detail = filtered.filter(
                      (n) => !essentialSet.has(n),
                    );

                    // Multi-select: categories + checkboxes + presets
                    return (
                      <>
                        {!metricSearch && (
                          <>
                            <S.DropdownItem
                              onClick={() => {
                                setSelectedMetrics([...essential.map((n) => n)]);
                                setMetricsOpen(false);
                                setMetricSearch("");
                              }}
                              style={{ fontWeight: 500 }}
                            >
                              {L.onlyEssential}
                            </S.DropdownItem>
                            <S.DropdownItem
                              onClick={() => {
                                setSelectedMetrics([...detail.map((n) => n)]);
                                setMetricsOpen(false);
                                setMetricSearch("");
                              }}
                              style={{ fontWeight: 500 }}
                            >
                              {L.onlyDetail}
                            </S.DropdownItem>
                            <S.DropdownDivider />
                          </>
                        )}
                        {essential.length > 0 && (
                          <>
                            <S.CategoryHeader>{L.categoryEssential}</S.CategoryHeader>
                            {essential.map((name) => (
                              <S.DropdownItem key={name}>
                                <S.Checkbox
                                  type="checkbox"
                                  checked={selectedMetrics.includes(name)}
                                  onChange={() => toggleMetric(name)}
                                />
                                {name}
                              </S.DropdownItem>
                            ))}
                          </>
                        )}
                        {detail.length > 0 && essential.length > 0 && (
                          <S.DropdownDivider />
                        )}
                        {detail.length > 0 && (
                          <>
                            <S.CategoryHeader>{L.categoryDetail}</S.CategoryHeader>
                            {detail.map((name) => (
                              <S.DropdownItem key={name}>
                                <S.Checkbox
                                  type="checkbox"
                                  checked={selectedMetrics.includes(name)}
                                  onChange={() => toggleMetric(name)}
                                />
                                {name}
                              </S.DropdownItem>
                            ))}
                          </>
                        )}
                        {filtered.length === 0 && metricSearch && (
                          <S.CategoryHeader>{L.noResults}</S.CategoryHeader>
                        )}
                      </>
                    );
                  })()}
                </S.DropdownMenu>
              )}
            </S.DropdownWrapper>
          </S.ControlGroup>

          {tagFilters?.map((filter) => {
            const currentValue = selectedTags[filter.tagKey] || (tagOptions[filter.tagKey]?.[0] ?? "");
            const open = tagsDropdownOpen[filter.tagKey] ?? false;
            return (
              <S.ControlGroup key={filter.tagKey} ref={(el) => { if (el) (el as any)._tagKey = filter.tagKey; }}>
                <S.ControlLabel>{filter.label}</S.ControlLabel>
                <S.DropdownWrapper>
                  <S.DropdownTrigger onClick={() =>
                    setTagsDropdownOpen((prev) => ({ ...prev, [filter.tagKey]: !prev[filter.tagKey] }))
                  }>
                    {currentValue || "—"} ▾
                  </S.DropdownTrigger>
                  {open && (
                    <S.DropdownMenu>
                      {(tagOptions[filter.tagKey] || []).map((v) => (
                        <S.DropdownItem
                          key={v}
                          onClick={() => {
                            setSelectedTags((prev) => ({ ...prev, [filter.tagKey]: v }));
                            setTagsDropdownOpen((prev) => ({ ...prev, [filter.tagKey]: false }));
                          }}
                          style={{ fontWeight: v === currentValue ? 600 : 400 }}
                        >
                          {v}
                        </S.DropdownItem>
                      ))}
                    </S.DropdownMenu>
                  )}
                </S.DropdownWrapper>
              </S.ControlGroup>
            );
          })}
        </S.Controls>
      </S.Header>

      {isLoading ? (
        <S.SkeletonWrapper>
          <S.Skeleton style={{ width: "100%", height: `${height}px` }} />
          <S.LoadingOverlay>
            <S.LoadingRing />
            <S.LoadingText>
              <span>{L.loading}</span>
              <S.LoadingDot>.</S.LoadingDot>
              <S.LoadingDot>.</S.LoadingDot>
              <S.LoadingDot>.</S.LoadingDot>
            </S.LoadingText>
          </S.LoadingOverlay>
        </S.SkeletonWrapper>
      ) : (
        <MultiLineChartV2
          data={chartData}
          yAxisLabel={yAxisLabel}
          height={height}
          colors={colors}
          showLegend={showLegend}
          annotations={filteredAnnotations}
          labels={LEGEND_TR}
          locale={locale}
        />
      )}
    </S.Container>
  );
};
