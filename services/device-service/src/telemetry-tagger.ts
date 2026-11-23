import type { TelemetryData } from "@gd-monorepo/shared-types";

/**
 * Telemetriye çalışma zamanı tag'lerini basar.
 *
 * Kaynak: `service.json` → `tags` (Telegraf tarzı global tag'ler; anahtar kümesi
 * serbesttir). Sıra:
 * 1. servis tag'leri (taban),
 * 2. config'ten gelen cihaz tag'leri (rack_id, aggregation, canonical, ...) — üzerine yazar,
 * 3. `device_id` (her zaman, son söz).
 *
 * Önceki `TelemetryTagger` sınıfı cihaz başına örnekleniyordu; tek farkı `deviceId`
 * olduğundan fonksiyona indirildi (cihaz başına nesne gereksiz).
 */
export function stampTags(
  telemetries: TelemetryData[],
  deviceId: string,
  tags?: Record<string, string>,
): TelemetryData[] {
  return telemetries.map((t) => ({
    ...t,
    tags: {
      ...tags,
      ...t.tags,
      device_id: deviceId,
    },
  }));
}
