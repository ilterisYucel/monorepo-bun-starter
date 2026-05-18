// utils/rackHelpers.ts
import type { TelemetryData } from "@gd-monorepo/shared-types";

export interface Rack {
  id: number;
  name: string;
  status: string;
  charge_status: "Charge" | "Discharge" | "Idle";
  soc: number | null;
  voltage: number | null;
  current: number | null;
  power_kw: number | null;
  temperature: number | null;
}

export const telemetriesToRacks = (
  telemetries: TelemetryData[],
  globalChargeStatus: "Charge" | "Discharge" | "Idle",
): Rack[] => {
  const rackMap = new Map<number, Rack>();

  // Önce her rack için temel yapıyı oluştur
  for (let i = 1; i <= 16; i++) {
    rackMap.set(i, {
      id: i,
      name: `Battery Rack ${i}`,
      status: "offline",
      charge_status: globalChargeStatus,
      soc: null,
      voltage: null,
      current: null,
      power_kw: null,
      temperature: null,
    });
  }

  // Telemetry'leri rack'lere ata
  for (const telemetry of telemetries) {
    const rackId = telemetry.tags?.rack_id;
    if (!rackId) continue;

    const rack = rackMap.get(parseInt(rackId));
    if (!rack) continue;

    switch (telemetry.name) {
      case "Status":
        rack.status = telemetry.value === 1 ? "online" : "offline";
        break;
      case "SoC":
        rack.soc = telemetry.value as number;
        break;
      case "Voltage":
        rack.voltage = telemetry.value as number;
        break;
      case "Current":
        rack.current = telemetry.value as number;
        break;
      case "Power":
        rack.power_kw = telemetry.value as number;
        break;
      case "Temperature":
        rack.temperature = telemetry.value as number;
        break;
    }
  }

  return Array.from(rackMap.values());
};

export const extractSystemChartData = (
  historicalTelemetries: TelemetryData[],
): ChartDataPoint[] => {
  // Önce zaman damgalarına göre grupla
  const timeMap = new Map<number, ChartDataPoint>();

  for (const telemetry of historicalTelemetries) {
    const timestamp = new Date(telemetry.timestamp).getTime();

    if (!timeMap.has(timestamp)) {
      timeMap.set(timestamp, {
        time: timestamp,
        voltage: null,
        current: null,
        power: null,
        temperature: null,
        soc: null,
      });
    }

    const point = timeMap.get(timestamp)!;

    switch (telemetry.name) {
      case "Voltage":
        point.voltage = telemetry.value as number;
        break;
      case "Current":
        point.current = telemetry.value as number;
        break;
      case "Power":
        point.power = telemetry.value as number;
        break;
      case "Temperature":
        point.temperature = telemetry.value as number;
        break;
      case "SoC":
        point.soc = telemetry.value as number;
        break;
    }
  }

  // Zaman sırasına göre diziye çevir
  return Array.from(timeMap.values()).sort((a, b) => a.time - b.time);
};
