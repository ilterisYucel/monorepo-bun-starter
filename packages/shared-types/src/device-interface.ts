import type { TelemetryData } from "./telemetry";

/**
 * IDevice — cihaz soyutlaması (ISP uyumlu, Faz 0 eki):
 * yalnızca her cihaz tipinin taahhüt edebileceği sözleşme. Okuma stratejisi
 * (register batching, bitfield çıkarımı vb.) cihazın KENDİ işidir — read()
 * her zaman cihazın tüm telemetrisini döner.
 */
export interface IDevice {
  id: string;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  read(telemetries?: TelemetryData[]): Promise<TelemetryData[]>;
  write(telemetries: TelemetryData[]): Promise<void>;
  writeAtomic?(telemetries: TelemetryData[]): Promise<void>;
}
