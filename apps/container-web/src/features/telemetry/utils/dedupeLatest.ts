// apps/container-web/src/features/telemetry/utils/dedupeLatest.ts
//
// En-yeni-kazanır dedup: aynı (deviceId, name, rack_id) için yalnız en yeni
// timestamp'li satır tutulur. REST (geçmiş pencere) + WS (canlı) birleşiminde
// eski satırların güncel değeri ezmesini engeller.

import type { TelemetryData } from "@gd-monorepo/shared-types";

export function telemetryKey(row: TelemetryData): string {
  return `${row.deviceId}|${row.name}|${row.tags?.rack_id ?? ""}`;
}

export function dedupeLatest<T extends TelemetryData>(rows: readonly T[]): T[] {
  const map = new Map<string, T>();
  for (const row of rows) {
    const key = telemetryKey(row);
    const prev = map.get(key);
    if (prev === undefined || Date.parse(row.timestamp) >= Date.parse(prev.timestamp)) {
      map.set(key, row);
    }
  }
  return [...map.values()];
}
