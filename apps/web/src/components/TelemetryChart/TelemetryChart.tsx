// src/components/TelemetryChart/TelemetryChart.tsx
import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  MultiLineChart,
  type ChartDataPoint,
} from "../MultiLineChart/MultiLineChart";
import { apiClient } from "../../shared/axios";
import type { TelemetryData } from "@gd-monorepo/shared-types";
import "./TelemetryChart.css";

interface TelemetryChartProps {
  /** Gösterilebilecek telemetry name'leri (örn: ["Voltage", "Current", "Power", "SoC"]) */
  telemetryNames: string[];
  /** Grafik başlığı */
  title: string;
  /** Y ekseni etiketi */
  yAxisLabel?: string;
  /** Grafik yüksekliği */
  height?: number;
  /** Renkler (opsiyonel) */
  colors?: string[];
  /** Legend gösterilsin mi? */
  showLegend?: boolean;
  /** Varsayılan zaman aralığı */
  defaultRange?: "1m" | "1h" | "1d";
  /** Varsayılan nokta sayısı */
  defaultPoints?: number;
}

interface DownsampledResponse {
  telemetries: TelemetryData[];
}

export const TelemetryChart: React.FC<TelemetryChartProps> = ({
  telemetryNames,
  title,
  yAxisLabel,
  height = 320,
  colors,
  showLegend = true,
  defaultRange = "1h",
  defaultPoints = 120,
}) => {
  // 🔥 State'ler
  const [timeRange, setTimeRange] = useState<"1m" | "1h" | "1d">(defaultRange);
  const [dataPoints, setDataPoints] = useState<number>(defaultPoints);

  // 🔥 Seçilen telemetry ("all" veya telemetryNames'den biri)
  const [selectedTelemetry, setSelectedTelemetry] = useState<string>("all");

  // 🔥 Downsampled veriyi çek
  const {
    data: telemetries = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: [
      "telemetry",
      "downsampled",
      timeRange,
      dataPoints,
      selectedTelemetry,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("range", timeRange);
      params.append("points", dataPoints.toString());

      // 🔥 Eğer "all" değilse, sadece seçilen name'i iste
      if (selectedTelemetry !== "all") {
        params.append("names", selectedTelemetry);
      }

      const response = await apiClient.get<DownsampledResponse>(
        `/racks/history/downsampled?${params.toString()}`,
      );
      return response.data.telemetries || [];
    },
    staleTime: 30000,
    refetchInterval: 60000,
  });

  // 🔥 TelemetryData[]'yi ChartDataPoint[]'e dönüştür
  // Sadece telemetryNames içindeki name'leri göster
  const chartData = useMemo(() => {
    if (telemetries.length === 0) return [];

    const timeMap = new Map<string, ChartDataPoint>();

    for (const telemetry of telemetries) {
      const timestamp = telemetry.timestamp;
      const name = telemetry.name;
      const value = telemetry.value as number;

      // 🔥 Sadece telemetryNames içinde olanları göster
      if (!telemetryNames.includes(name)) {
        continue;
      }

      // 🔥 Eğer belirli bir telemetry seçilmişse, sadece onu göster
      if (selectedTelemetry !== "all" && selectedTelemetry !== name) {
        continue;
      }

      if (!timeMap.has(timestamp)) {
        timeMap.set(timestamp, { timestamp });
      }

      const point = timeMap.get(timestamp)!;
      point[name] = value;
    }

    return Array.from(timeMap.values()).sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );
  }, [telemetries, telemetryNames, selectedTelemetry]);

  const getRangeLabel = () => {
    switch (timeRange) {
      case "1m":
        return "Son 1 Dakika";
      case "1h":
        return "Son 1 Saat";
      case "1d":
        return "Son 1 Gün";
      default:
        return "Son 1 Saat";
    }
  };

  if (isLoading) {
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
        <p style={{ color: "#9ca3af" }}>Veriler yükleniyor...</p>
      </div>
    );
  }

  if (isError) {
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
        <p style={{ color: "#ef4444" }}>
          Veri yüklenirken hata oluştu: {error?.message}
        </p>
      </div>
    );
  }

  return (
    <div className="telemetry-chart">
      <div className="chart-controls">
        <div className="control-group">
          <label>📅 Zaman Aralığı:</label>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
          >
            <option value="1m">Son 1 Dakika</option>
            <option value="1h">Son 1 Saat</option>
            <option value="1d">Son 1 Gün</option>
          </select>
        </div>

        <div className="control-group">
          <label>📊 Nokta Sayısı:</label>
          <select
            value={dataPoints}
            onChange={(e) => setDataPoints(Number(e.target.value))}
          >
            <option value={60}>60 Nokta</option>
            <option value={120}>120 Nokta</option>
            <option value={240}>240 Nokta</option>
            <option value={500}>500 Nokta</option>
          </select>
        </div>

        {/* 🔥 Telemetry Seçimi - Sadece telemetryNames'den gelenler */}
        <div className="control-group">
          <label>📈 Veri Tipi:</label>
          <select
            value={selectedTelemetry}
            onChange={(e) => setSelectedTelemetry(e.target.value)}
          >
            <option value="all">📊 Tümü)</option>
            {telemetryNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>

        <div className="range-indicator">
          <span className="range-badge">{getRangeLabel()}</span>
          <span className="points-badge">{dataPoints} nokta</span>
        </div>
      </div>

      <MultiLineChart
        data={chartData}
        title={`${title} (${getRangeLabel()})${selectedTelemetry !== "all" ? ` - ${selectedTelemetry}` : ""}`}
        yAxisLabel={yAxisLabel}
        height={height}
        colors={colors}
        showLegend={showLegend}
      />
    </div>
  );
};
