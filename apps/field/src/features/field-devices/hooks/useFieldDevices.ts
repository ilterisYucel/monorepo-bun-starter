import type { TelemetryData } from "@gd-monorepo/shared-types";
import type { DeviceInfo } from "../types/device";

/** DeviceId öneki → cihaz tipi (field tier — config adlandırması). */
const DEVICE_TYPE_BY_PREFIX: Array<[string, string]> = [
  ["BSC-", "bsc"],
  ["PCS-", "pcs"],
  ["EMU-", "emu"],
  ["CB-", "cb"],
  ["DC-OUTPUT-", "dc-output"],
  ["DC-", "dc-output"],
  ["HVAC-", "hvac"],
  ["PM5340-", "energy-analyzer"],
];

function deviceTypeOf(deviceId: string): string {
  for (const [prefix, type] of DEVICE_TYPE_BY_PREFIX) {
    if (deviceId.startsWith(prefix)) return type;
  }
  return "unknown";
}

/** Snapshot taşıyıcısı — FieldContainer/ContainerSummary yapısal uyumludur. */
export interface SnapshotCarrier {
  latestTelemetry: TelemetryData[];
}

/**
 * Faz 5.1 B3 — field tier cihaz listesi: konteyner snapshot'ından türetilir.
 *
 * Field stack'inde `devices` tablosu YOKTUR (device-service konteynerdedir);
 * cihaz satırları `/fields/:id/containers` yanıtındaki `latestTelemetry`
 * snapshot'larından üretilir: benzersiz `deviceId` başına bir satır.
 * 2026-09-02: Devices sayfası tünel listesini (gerçek isim/model/tip)
 * tercih eder; bu fonksiyon KADEMELİ BOZULMA fallback'idir.
 *
 * Kısıtlar (sözleşme):
 * - Snapshot yalnızca online cihazları taşır → satır durumu hep "online".
 * - Cihaz adı/üretici/modeli snapshot'ta taşınmaz → `name` = deviceId,
 *   `protocol` = "ws", diğer meta alanları null.
 * - `last_seen` = cihazın snapshot'taki en yeni timestamp'i.
 */
export function deriveDevicesFromSnapshot(
  containers: SnapshotCarrier[],
): DeviceInfo[] {
  const byId = new Map<string, DeviceInfo>();
  for (const container of containers) {
    for (const item of container.latestTelemetry) {
      const deviceId = item.deviceId;
      if (!deviceId) continue;
      const existing = byId.get(deviceId);
      if (existing) {
        if (
          item.timestamp &&
          (!existing.last_seen || item.timestamp > existing.last_seen)
        ) {
          existing.last_seen = item.timestamp;
        }
        continue;
      }
      byId.set(deviceId, {
        id: deviceId,
        name: deviceId,
        protocol: "ws",
        type: deviceTypeOf(deviceId),
        status: "online",
        manufacturer: null,
        model: null,
        rack_count: null,
        poll_interval_ms: null,
        connection: null,
        last_seen: item.timestamp ?? null,
        created_at: "",
      });
    }
  }
  return [...byId.values()];
}

/**
 * Faz 5.1 B3 — seçili cihazın anlık telemetrisi (Detay modalı beslemesi).
 *
 * Tüm konteyner snapshot'larından `deviceId` eşleşen satırlar toplanır;
 * aynı (deviceId, name) çifti birden fazla kez varsa en yeni timestamp'li
 * satır korunur (dedup — son değer kazanır).
 */
export function latestTelemetryForDevice(
  containers: SnapshotCarrier[],
  deviceId: string,
): TelemetryData[] {
  const byName = new Map<string, TelemetryData>();
  for (const container of containers) {
    for (const item of container.latestTelemetry) {
      if (item.deviceId !== deviceId) continue;
      const existing = byName.get(item.name);
      if (!existing || (item.timestamp ?? "") >= (existing.timestamp ?? "")) {
        byName.set(item.name, item);
      }
    }
  }
  return [...byName.values()];
}
