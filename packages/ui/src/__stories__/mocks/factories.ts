import type { Rack } from "../../types/rack";
import type { RackCellConfig } from "../../graphics/elements/RackCell/RackCell.types";
import type {
  HvacData,
  RectPosition,
  OutputPosition,
  RoomTemperature,
} from "../../graphics/types";
import type { LogEntry, TelemetryData, ManeuverConfig } from "@gd-monorepo/shared-types";
import type { LogProvider } from "../../interfaces/log-provider";
import type { TelemetryProvider } from "../../interfaces/telemetry-provider";
import type { ChartDataPoint } from "../../types/chart";
import type { EnergyAnalyzerSummary } from "../../components/EnergyAnalyzerCard/EnergyAnalyzerCard.types";
import type { FirePanelState } from "../../components/FirePanelCard/FirePanelCard.types";
import type { Container3DState } from "../../components/PlayCanvasViewer/PlayCanvasViewer.types";
import type { MockTelemetryDef } from "../../transports/MockTransport";
import type { InputField, StepResult } from "../../components/ManeuverCard/ManeuverCard.types";

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

export function createMockLogEntry(
  overrides: Partial<LogEntry> = {},
): LogEntry {
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

export function createMockChartData(
  count: number,
  keys: string[],
): ChartDataPoint[] {
  const now = Date.now();
  return Array.from({ length: count }, (_, i) => {
    const timestamp = new Date(
      now - (count - 1 - i) * 5 * 60_000,
    ).toISOString();
    const point: ChartDataPoint = { timestamp };
    for (const key of keys) {
      const noise = ((i * key.length * 7 + key.length * 13) % 50) / 10;
      point[key] =
        Math.round(
          (Math.sin(i * 0.3) * 10 + 50 + key.length * 5 + noise) * 100,
        ) / 100;
    }
    return point;
  });
}

export function createMockRackCellConfig(s = 100): RackCellConfig {
  return { step: s, rackWidth: 120, rackHeight: 380 };
}

export function createMockHvacData(
  status: HvacData["status"],
  mode: HvacData["mode"],
): HvacData {
  return { status, mode };
}

export function createMockRectPosition(
  x: number,
  y: number,
  width: number,
  height: number,
): RectPosition {
  return { x, y, width, height };
}

export function createMockOutputPosition(
  x: number,
  y: number,
  radius: number,
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

export function createMockTMSSystemRoom(
  overrides?: Partial<RoomData>,
): RoomData {
  return {
    temp: 22,
    hvacs: [
      { status: "online", mode: "cooling" },
      { status: "online", mode: "cooling" },
    ],
    ...overrides,
  } as RoomData;
}

export function createMockTelemetryData(
  names: string[],
  deviceId = "bsc-1",
): TelemetryData[] {
  const now = new Date().toISOString();
  return names.map((name, i) => ({
    name,
    value: Math.round((48 + i * 2.5 + (i % 3)) * 10) / 10,
    unit: name === "Temperature" ? "°C" : name === "Power" ? "kW" : "V",
    timestamp: now,
    deviceId,
    tags: { canonical: name.toLowerCase() },
  }));
}

export function createMockTelemetryProvider(
  data: TelemetryData[],
  overrides?: Partial<TelemetryProvider>,
): TelemetryProvider {
  return {
    data,
    isLoading: false,
    isError: false,
    error: null,
    selectedName: "all",
    range: "1h",
    points: 120,
    refetch: () => {},
    setRange: () => {},
    setCustomRange: () => {},
    setPoints: () => {},
    setSelectedName: () => {},
    ...overrides,
  };
}

export function createMockEnergyAnalyzerSummary(
  deviceId = "energy-1",
): EnergyAnalyzerSummary {
  const phase = {
    voltageLN: 231.2,
    voltageLL: 400.5,
    current: 12.4,
    activePower: 4.2,
    reactivePower: 1.1,
    apparentPower: 4.35,
    powerFactor: 0.97,
    thdCurrent: 2.1,
  };
  return {
    deviceId,
    frequency: 50.02,
    activeEnergyDelivered: 1240.5,
    neutralCurrent: 0.8,
    demandPowerPresent: 38.1,
    demandPowerPeak: 52.3,
    demandCurrentPresent: 95.2,
    reactiveEnergyDelivered: 210.4,
    reactiveEnergyReceived: 18.6,
    apparentEnergy: 1258.1,
    activeEnergyReceived: 96.3,
    phaseA: { ...phase },
    phaseB: { ...phase, current: 11.9, activePower: 4.0 },
    phaseC: { ...phase, current: 13.1, activePower: 4.5 },
  };
}

export function createMockFirePanelState(
  overrides?: Partial<FirePanelState>,
): FirePanelState {
  return {
    fault: false,
    fire: false,
    firstStage: false,
    secondStage: false,
    discharged: false,
    extract: false,
    modeAuto: true,
    hold: false,
    abort: false,
    reset: false,
    localFire: false,
    ...overrides,
  };
}

export function createMockManeuverConfig(
  overrides?: Partial<ManeuverConfig>,
): ManeuverConfig {
  return {
    name: "charge_all",
    label: "Tüm BSC'leri Şarj Et",
    description: "Sahadaki tüm BSC'leri şarj moduna alır",
    mode: "parallel",
    steps: [
      { deviceId: "bsc-1", command: "charge" },
      { deviceId: "bsc-2", command: "charge" },
      { deviceId: "bsc-3", command: "charge" },
    ],
    rollbackSteps: [{ deviceId: "bsc-1", command: "stop" }],
    onFailure: "continue",
    ...overrides,
  };
}

export function createMockManeuverInputs(): InputField[] {
  return [
    {
      name: "powerKw",
      label: "Toplam Güç",
      unit: "kW",
      min: 0,
      max: 3568,
      step: 1,
      default: 1500,
      description: "BSC'lere dağıtılacak toplam güç",
    },
    {
      name: "durationMin",
      label: "Süre",
      unit: "dk",
      min: 1,
      max: 480,
      step: 1,
      default: 60,
    },
  ];
}

export function createMockStepResults(success = true): StepResult[] {
  return [
    { deviceId: "bsc-1", command: "charge", success },
    { deviceId: "bsc-2", command: "charge", success, reason: success ? undefined : "Cihaz offline" },
    { deviceId: "bsc-3", command: "charge", success },
  ];
}

export function createMockContainer3DStates(): Container3DState[] {
  return [
    {
      id: "container-1",
      label: "Konteyner 1",
      position: [0, 0, 0],
      status: "online",
      telemetry: { soc: 82, power: 420, temperature: 27 },
    },
    {
      id: "container-2",
      label: "Konteyner 2",
      position: [6, 0, 0],
      status: "warning",
      telemetry: { soc: 55, power: -180, temperature: 34 },
    },
    {
      id: "container-3",
      label: "Konteyner 3",
      position: [12, 0, 0],
      status: "offline",
    },
  ];
}

export function createMockTransportDefs(): MockTelemetryDef[] {
  return [
    { name: "Voltage", unit: "V", min: 46, max: 52 },
    { name: "Current", unit: "A", min: -20, max: 20 },
    { name: "Temperature", unit: "°C", min: 22, max: 40 },
  ];
}
