// src/modules/telemetry/utils/chartHelpers.ts
import type { TelemetryData } from "@gd-monorepo/shared-types";
import type { ChartDataPoint } from "../types";

export const extractSystemChartData = (
  historicalTelemetries: TelemetryData[],
): ChartDataPoint[] => {
  if (!historicalTelemetries || historicalTelemetries.length === 0) {
    return [];
  }

  // 🔥 timestamp + name bazlı grupla (tüm rack'lerin değerlerini topla)
  const timeMap = new Map<
    string,
    Map<string, { sum: number; count: number }>
  >();

  for (const telemetry of historicalTelemetries) {
    const timestamp = telemetry.timestamp;
    const name = telemetry.name;
    const value = telemetry.value as number;

    if (!timeMap.has(timestamp)) {
      timeMap.set(timestamp, new Map());
    }

    const nameMap = timeMap.get(timestamp)!;
    if (!nameMap.has(name)) {
      nameMap.set(name, { sum: 0, count: 0 });
    }

    const stat = nameMap.get(name)!;
    stat.sum += value;
    stat.count += 1;
  }

  // 🔥 Her timestamp için ortalamaları hesapla (16 rack'in ortalaması)
  const result: ChartDataPoint[] = [];
  for (const [timestamp, nameMap] of timeMap) {
    const point: ChartDataPoint = { timestamp };
    for (const [name, stat] of nameMap) {
      // Tüm rack'lerin ortalaması = toplam / 16
      const avg = stat.sum / stat.count;
      point[name] = parseFloat(avg.toFixed(2));
    }
    result.push(point);
  }

  // Zamana göre sırala
  return result.sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );
};

export const extractRackChartData = (
  historicalTelemetries: TelemetryData[],
  rackId: number,
): ChartDataPoint[] => {
  // 🔥 Belirli bir rack'in verilerini filtrele
  const filtered = historicalTelemetries.filter(
    (t) => t.tags?.rack_id === String(rackId),
  );

  if (filtered.length === 0) return [];

  // timestamp + name bazlı grupla (tek rack için)
  const timeMap = new Map<string, Map<string, number>>();

  for (const telemetry of filtered) {
    const timestamp = telemetry.timestamp;
    const name = telemetry.name;
    const value = telemetry.value as number;

    if (!timeMap.has(timestamp)) {
      timeMap.set(timestamp, new Map());
    }

    const nameMap = timeMap.get(timestamp)!;
    nameMap.set(name, value);
  }

  const result: ChartDataPoint[] = [];
  for (const [timestamp, nameMap] of timeMap) {
    const point: ChartDataPoint = { timestamp };
    for (const [name, value] of nameMap) {
      point[name] = value;
    }
    result.push(point);
  }

  return result.sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );
};
