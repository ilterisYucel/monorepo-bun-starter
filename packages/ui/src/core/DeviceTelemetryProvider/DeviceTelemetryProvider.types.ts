import type { ITelemetryTransport } from "@gd-monorepo/shared-types";

export interface DeviceTelemetryProviderProps {
  deviceId: string;
  transport: ITelemetryTransport;
  bufferSize?: number;
  children: React.ReactNode;
}

export interface DeviceTelemetryContextValue {
  deviceId: string;
  isConnected: boolean;
  error: string | null;
  metric: (name: string) => { value: number | string | boolean; unit: string; timestamp: string } | undefined;
}
