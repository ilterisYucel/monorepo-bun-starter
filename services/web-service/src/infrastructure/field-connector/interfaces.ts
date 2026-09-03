import type { TelemetryData } from "@gd-monorepo/shared-types";

/**
 * ITelemetrySeriesSource — Faz 5.1: tarihsel (downsampled) seri sorgusu.
 * Konteyner tarafında `telemetry-query` kontrol frame'ini yanıtlar; kaynak
 * TimescaleDB'dir. Hata fırlatırsa yanıtlayıcı `telemetry-query-error`
 * döner — kanal etkilenmez (kademeli bozulma).
 */
export interface TelemetrySeriesQuery {
  from: Date;
  to: Date;
  points: number;
  deviceIds?: string[];
  names?: string[];
}

export interface ITelemetrySeriesSource {
  series(query: TelemetrySeriesQuery): Promise<TelemetryData[]>;
}
