import type { WebSocket } from "ws";
import type { TelemetryData } from "@gd-monorepo/shared-types";
import type { ConnectionState } from "@gd-monorepo/shared-types";
import type { DownsampleOptions } from "../timeseries/interface";

export interface ContainerObserver {
  onData(containerId: string, telemetries: TelemetryData[]): void;
  onConnectionChange(containerId: string, state: ConnectionState): void;
}

export interface IContainerProxy {
  start(): Promise<void>;
  stop(): Promise<void>;

  registerContainer(containerId: string, ws: WebSocket): void;
  unregisterContainer(containerId: string): void;

  latestTelemetry(containerId: string): TelemetryData[];

  // ELEGANT-EXCEPTION: "historical" is a noun (short for "historical data")
  historical(containerId: string, params: Omit<DownsampleOptions, "deviceId">): Promise<TelemetryData[]>;

  allHistorical(containerIds: string[], params: Omit<DownsampleOptions, "deviceId">): Promise<Record<string, TelemetryData[]>>;

  connectionStatus(): Map<string, ConnectionState>;

  setContainerUrl(containerId: string, url: string): void;

  addObserver(observer: ContainerObserver): void;
  removeObserver(observer: ContainerObserver): void;

  health(containerId: string): Promise<boolean>;
}
