import type { TelemetryData } from "./telemetry-data";

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
  /**
   * Opsiyonel — çok-abone multipleks (component-bazlı izolasyon). Destekleyen
   * transport TEK soketi paylaşır ve abonelikleri referans-sayarak ekler/çıkarır.
   * `names` verilirse sunucu yalnız o telemetri isimlerini yollar (panel spec'i).
   * Desteklemeyen transport'ta tüketici hook `connect(params)`/`disconnect()`
   * fallback'ine düşer.
   */
  addDevices?(deviceIds: readonly string[], names?: readonly string[]): void;
  removeDevices?(deviceIds: readonly string[]): void;
}
