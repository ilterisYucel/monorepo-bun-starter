import type { TelemetryData } from "@gd-monorepo/shared-types";

export function extractChargeStatus(
  telemetries: TelemetryData[],
): TelemetryData | undefined {
  const info = telemetries.find(
    (t) =>
      t.name === "Charge Status" ||
      t.name === "BSC Info" ||
      t.name?.includes("Charge Status"),
  );
  if (!info || typeof info.value !== "number") return undefined;

  const bits = (info.value >> 4) & 0b11;
  const value = bits === 0b01 ? 1 : bits === 0b10 ? 2 : 0;

  return {
    name: "ChargeStatus",
    description: "Global charge/discharge/idle status",
    value,
    unit: "",
    timestamp: info.timestamp,
    deviceId: info.deviceId,
    tags: {},
  } as TelemetryData;
}

export function deriveStatusEntries(
  telemetries: TelemetryData[],
): TelemetryData[] {
  const results: TelemetryData[] = [];
  for (const t of telemetries) {
    if (!t.name?.startsWith("Rack State")) continue;
    results.push({
      name: "Status",
      description: "Rack online/offline status",
      value: t.value === 0x09 ? 1 : 0,
      unit: "",
      timestamp: t.timestamp,
      deviceId: t.deviceId,
      tags: { ...t.tags },
    } as TelemetryData);
  }
  return results;
}

export function applyRackOffset(
  t: TelemetryData,
  offset: number,
): TelemetryData {
  if (!t.tags?.rack_id || offset === 0) return t;

  const orig = parseInt(t.tags.rack_id, 10);
  if (isNaN(orig)) return t;

  return {
    ...t,
    tags: { ...t.tags, rack_id: (orig + offset).toString() },
  };
}
