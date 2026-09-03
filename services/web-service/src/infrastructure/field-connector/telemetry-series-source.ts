import type { ITimeseriesDatabase } from "@gd-monorepo/core";
import type { TelemetryData } from "@gd-monorepo/shared-types";
import type { DeviceRegistry } from "../../persistence/device-registry";
import type { ITelemetrySeriesSource, TelemetrySeriesQuery } from "./interfaces";

/**
 * TelemetrySeriesSource — Faz 5.1: `telemetry-query` frame'inin veri kaynağı.
 *
 * Çevrimiçi cihazlarda (`devices.status='online'`) downsampled seri sorgular;
 * tek cihaz hatası diğerlerini etkilemez (Promise.allSettled), tamamı hatalıysa
 * boş dizi döner — yanıtlayıcı boş sonucu olduğu gibi iletir (kademeli bozulma).
 */
export class TelemetrySeriesSource implements ITelemetrySeriesSource {
  constructor(
    private readonly registry: DeviceRegistry,
    private readonly timescale: ITimeseriesDatabase,
  ) {}

  async series(query: TelemetrySeriesQuery): Promise<TelemetryData[]> {
    await this.registry.refresh();

    const ids = query.deviceIds ?? [];
    const targetDevices = this.registry.online().filter(
      (d) => ids.length === 0 || ids.includes(d.id),
    );

    const results = await Promise.allSettled(
      targetDevices.map((d) =>
        this.timescale.getDownsampledData({
          deviceId: d.id,
          names: query.names,
          from: query.from,
          to: query.to,
          points: query.points,
        }),
      ),
    );
    return results.flatMap((r) =>
      r.status === "fulfilled" ? r.value : [],
    );
  }
}
