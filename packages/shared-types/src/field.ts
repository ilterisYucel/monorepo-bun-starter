import type { TelemetryData } from "./telemetry";

export interface FieldLocation {
  lat: number;
  lng: number;
}

export interface Field {
  id: string;
  name: string;
  location: FieldLocation;
  apiUrl?: string;
  status: "online" | "warning" | "offline";
  containerCount: number;
  onlineContainerCount: number;
  totalPowerMw?: number;
  avgSoc?: number;
  activeAlarms?: number;
  createdAt: string;
  updatedAt: string;
}

export interface FieldSummary {
  field: Field;
  containers: ContainerStatus[];
  telemetries: TelemetryData[];
}

export interface ContainerStatus {
  containerId: string;
  containerUrl: string;
  connected: boolean;
  lastSeenAt: string;
  latestTelemetry: TelemetryData[];
}

export interface ContainerLayout {
  containerId: string;
  position: { x: number; y: number; z: number };
  rotation?: { x: number; y: number; z: number };
  scale?: number;
}

export interface FieldConfig {
  id: string;
  name: string;
  location: FieldLocation;
  containers: ContainerConfig[];
}

export interface ContainerConfig {
  containerId: string;
  baseUrl: string;
  wsUrl: string;
}
