import type { TelemetryData } from "./telemetry";

export type ConnectionState = "idle" | "connecting" | "connected" | "error";

export interface ConnectParams {
  deviceId: string;
  token?: string;
}

export interface TelemetryObserver {
  onData(batch: TelemetryData[]): void;
  onError(error: Error): void;
  onConnectionChange(state: ConnectionState): void;
}

export interface ITelemetryTransport {
  connect(params: ConnectParams): Promise<void>;
  disconnect(): Promise<void>;
  connectionState(): ConnectionState;
  subscribe(observer: TelemetryObserver): () => void;
}
