// packages/ui/src/components/TelemetryChart/TelemetryChart.tsx
import React, { useMemo } from "react";
import { MultiLineChart } from "../MultiLineChart";
import type { TelemetryChartProps } from "./TelemetryChart.types";
import * as S from "./TelemetryChart.styles";
import type { ChartDataPoint } from "../../types";

export const TelemetryChart: React.FC<TelemetryChartProps> = ({
  provider,
  telemetryNames,
  title,
  yAxisLabel,
  height = 320,
  colors,
  showLegend = true,
}) => {
  const {
    data: telemetries,
    isLoading,
    isError,
    error,
    selectedName,
    range,
    points,
    setRange,
    setPoints,
    setSelectedName,
  } = provider;

  const chartData = useMemo(() => {
    if (telemetries.length === 0) return [];
    const timeMap = new Map<string, ChartDataPoint>();
    for (const telemetry of telemetries) {
      const timestamp = telemetry.timestamp;
      const name = telemetry.name;
      const value = telemetry.value as number;
      if (!telemetryNames.includes(name)) continue;
      if (selectedName !== "all" && selectedName !== name) continue;
      if (!timeMap.has(timestamp)) timeMap.set(timestamp, { timestamp });
      const point = timeMap.get(timestamp)!;
      point[name] = value;
    }
    return Array.from(timeMap.values()).sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );
  }, [telemetries, telemetryNames, selectedName]);

  const getRangeLabel = (): string => {
    switch (range) {
      case "1m":
        return "Son 1 Dakika";
      case "1h":
        return "Son 1 Saat";
      case "1d":
        return "Son 1 Gün";
      case "1w":
        return "Son 1 Hafta";
      case "1M":
        return "Son 1 Ay";
      case "3M":
        return "Son 3 Ay";
      case "6M":
        return "Son 6 Ay";
      case "1y":
        return "Son 1 Yıl";
      default:
        return "Son 1 Saat";
    }
  };

  if (isLoading) {
    return (
      <S.Loading style={{ height: `${height}px` }}>
        <p>Veriler yükleniyor...</p>
      </S.Loading>
    );
  }

  if (isError) {
    return (
      <S.Error style={{ height: `${height}px` }}>
        <p>Veri yüklenirken hata oluştu: {error?.message}</p>
      </S.Error>
    );
  }

  return (
    <S.Container>
      <S.Controls>
        <S.ControlGroup>
          <S.ControlLabel>📅 Zaman Aralığı:</S.ControlLabel>
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
          <S.ControlLabel>📊 Nokta Sayısı:</S.ControlLabel>
          <S.ControlSelect
            value={points}
            onChange={(e) => setPoints(Number(e.target.value))}
          >
            <option value={60}>60 Nokta</option>
            <option value={120}>120 Nokta</option>
            <option value={240}>240 Nokta</option>
            <option value={500}>500 Nokta</option>
          </S.ControlSelect>
        </S.ControlGroup>

        <S.ControlGroup>
          <S.ControlLabel>📈 Veri Tipi:</S.ControlLabel>
          <S.ControlSelect
            value={selectedName}
            onChange={(e) => setSelectedName(e.target.value)}
          >
            <option value="all">📊 Tümü</option>
            {telemetryNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </S.ControlSelect>
        </S.ControlGroup>

        <S.RangeIndicator>
          <S.RangeBadge>{getRangeLabel()}</S.RangeBadge>
          <S.PointsBadge>{points} nokta</S.PointsBadge>
        </S.RangeIndicator>
      </S.Controls>

      <MultiLineChart
        data={chartData}
        title={`${title} (${getRangeLabel()})${selectedName !== "all" ? ` - ${selectedName}` : ""}`}
        yAxisLabel={yAxisLabel}
        height={height}
        colors={colors}
        showLegend={showLegend}
      />
    </S.Container>
  );
};
