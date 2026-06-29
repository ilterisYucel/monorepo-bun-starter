import type { Rack } from "../../types/rack";
import type { RackCellConfig } from "../../graphics/elements/RackCell/RackCell.types";
import type { HvacData, RectPosition, OutputPosition, RoomTemperature } from "../../graphics/types";
import type { LogEntry } from "@gd-monorepo/shared-types";
import type { LogProvider } from "../../interfaces/log-provider";
import type { ChartDataPoint } from "../../types/chart";

let _logIdCounter = 0;

export function createMockRack(
  status: Rack["status"],
  chargeStatus: Rack["charge_status"],
  overrides?: Partial<Rack>,
): Rack {
  return {
    id: 1,
    deviceId: "RACK-01",
    name: "Test Rack 01",
    status,
    charge_status: chargeStatus,
    soc: null,
    voltage: null,
    current: null,
    power_kw: null,
    temperature: null,
    ...overrides,
  };
}

export function createMockLogEntry(overrides: Partial<LogEntry> = {}): LogEntry {
  _logIdCounter++;
  return {
    id: overrides.id ?? `log-${_logIdCounter}`,
    timestamp: overrides.timestamp ?? new Date().toISOString(),
    type: overrides.type ?? "info",
    source: overrides.source ?? "system",
    message: overrides.message ?? "Sistem başlatıldı",
    details: overrides.details,
    ...overrides,
  };
}

export function createMockLogProvider(logs?: LogEntry[]): LogProvider {
  return {
    logs: logs ?? [],
    addLog: () => {},
    clearLogs: () => {},
  };
}

export function createMockChartData(count: number, keys: string[]): ChartDataPoint[] {
  const now = Date.now();
  return Array.from({ length: count }, (_, i) => {
    const timestamp = new Date(now - (count - 1 - i) * 5 * 60_000).toISOString();
    const point: ChartDataPoint = { timestamp };
    for (const key of keys) {
      point[key] = Math.round((Math.sin(i * 0.3) * 10 + 50 + key.length * 5 + Math.random() * 5) * 100) / 100;
    }
    return point;
  });
}

export function createMockRackCellConfig(step?: number): RackCellConfig {
  const s = step ?? 100;
  return { step: s, rackWidth: 120, rackHeight: 380 };
}

export function createMockHvacData(
  status: HvacData["status"],
  mode: HvacData["mode"],
): HvacData {
  return { status, mode };
}

export function createMockRectPosition(
  x: number, y: number, width: number, height: number,
): RectPosition {
  return { x, y, width, height };
}

export function createMockOutputPosition(
  x: number, y: number, radius: number,
): OutputPosition {
  return { x, y, radius };
}

export function createMockRoomData(temp: number): RoomTemperature {
  return { temp };
}

import type { BSCUnit } from "../../graphics/deprecated/BSCGraphic/BSCGraphic.types";
import type { RoomData } from "../../graphics/deprecated/TMSGraphic/TMSGraphic.types";

export function createMockBSCUnit(overrides?: Partial<BSCUnit>): BSCUnit {
  return {
    deviceId: "BSC-1",
    racks: [],
    breakerStatus: "online",
    breakerPosition: "close",
    dcOutput: { status: "online", voltage: 48, current: 12 },
    ...overrides,
  };
}

export function createMockTMSSystemRoom(overrides?: Partial<RoomData>): RoomData {
  return {
    temp: 22,
    hvacs: [
      { status: "online", mode: "cooling" },
      { status: "online", mode: "cooling" },
    ],
    ...overrides,
  } as RoomData;
}
