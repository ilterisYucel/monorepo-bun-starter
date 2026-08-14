import type { TelemetryData } from "@gd-monorepo/shared-types";

export interface TelemetryTaggerConfig {
  deviceId: string;
  containerId?: string;
  fieldId?: string;
}

/**
 * Telemetriye çalışma zamanı tag'leri ekler.
 *
 * - Config'de elle girilen tag'ler (rack_id, aggregation, variant, ...) KORUNUR.
 * - device_id her zaman eklenir (config.deviceId).
 * - container_id yalnızca container-level app'te (CONTAINER_ID env) eklenir.
 * - field_id yalnızca field-level app'te (FIELD_ID env) eklenir.
 */
export class TelemetryTagger {
  constructor(private readonly config: TelemetryTaggerConfig) {}

  enrich(telemetries: TelemetryData[]): TelemetryData[] {
    const { deviceId, containerId, fieldId } = this.config;

    return telemetries.map((t) => ({
      ...t,
      tags: {
        ...t.tags,
        device_id: deviceId,
        ...(containerId ? { container_id: containerId } : {}),
        ...(fieldId ? { field_id: fieldId } : {}),
      },
    }));
  }
}
