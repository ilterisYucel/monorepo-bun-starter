import type { Rack } from "@gd-monorepo/ui";

export interface RackNameplate {
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  firmwareVersion?: string;
  hardwareVersion?: string;
  bmsSwName?: string;
  packCount?: number;
  bmicCount?: number;
  tempSensorCount?: number;
  voltageSensorCount?: number;
  currentSensorType?: string;
  relayCloseCurrent?: number | null;
  packType?: string;
}

export interface RackExtendedTelemetry {
  chargePowerLimit: number | null;
  dischargePowerLimit: number | null;
  maxCellVoltage: number | null;
  minCellVoltage: number | null;
  avgCellVoltage: number | null;
  maxCellLocation?: string;
  minCellLocation?: string;
  maxPackTemperature: number | null;
  minPackTemperature: number | null;
  avgPackTemperature: number | null;
  maxTempLocation?: string;
  minTempLocation?: string;
  maxDiffTempRack: number | null;
  maxDiffTempPack: number | null;
  balancingTime: number | null;
  mcOpenCount: number | null;
  nonBalancingPeriod: number | null;
  state?: string;
  liveUnitCount: number | null;
  heartbeat: number | null;
}

export interface RackDiagnosticFlag {
  name: string;
  active: boolean;
}

export interface RackDiagnosticGroup {
  register: string;
  flags: RackDiagnosticFlag[];
}

export interface RackDetailData extends Rack {
  nameplate?: RackNameplate;
  extendedTelemetry?: RackExtendedTelemetry;
  diagnostics?: RackDiagnosticGroup[];
}

export interface RackDetailModalProps {
  data: RackDetailData | null;
  open: boolean;
  onClose: () => void;
}
