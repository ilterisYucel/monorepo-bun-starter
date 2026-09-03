import { describe, it, expect } from "vitest";
import {
  deriveDevicesFromSnapshot,
  latestTelemetryForDevice,
} from "./useFieldDevices";
import type { FieldContainer } from "../../containers/services/containersApi";
import type { TelemetryData } from "@gd-monorepo/shared-types";

/**
 * Faz 5.1 B3 — field tier cihaz listesi sözleşmesi:
 * field stack'inde device-service ve `devices` tablosu YOKTUR (bkz.
 * device-routes.ts B3 değişikliği — /unified/devices artık 200 {devices: []}).
 * Cihazlar, konteyner snapshot'ından (`/fields/:id/containers` →
 * `latestTelemetry`) türetilir. Snapshot yalnızca online cihazları taşır
 * (RealtimeSnapshotSource — status='online' filtresi).
 */

const point = (
  deviceId: string,
  name: string,
  value: unknown,
  timestamp = "2026-08-25T12:00:00.000Z",
): TelemetryData =>
  ({
    deviceId,
    name,
    value,
    description: "",
    unit: "",
    timestamp,
  }) as TelemetryData;

const container = (
  containerId: string,
  telemetry: TelemetryData[],
): FieldContainer => ({
  containerId,
  layout: { x: 0, y: 0, z: 0 },
  connectionStatus: "connected",
  latestTelemetry: telemetry,
});

describe("deriveDevicesFromSnapshot (B3)", () => {
  it("benzersiz deviceId başına bir satır üretir (19 cihazlı konteyner)", () => {
    const rows = deriveDevicesFromSnapshot([
      container("c-1", [
        point("BSC-1", "SOC", 90),
        point("BSC-1", "Voltage", 750),
        point("BSC-2", "SOC", 80),
        point("PCS-1", "AC Active Power", -50),
        point("PCS-2", "AC Active Power", -30),
        point("PCS-3", "AC Active Power", 0),
        point("EMU-1", "System SOC", 85),
        point("CB-1", "Is Closed", true),
        point("DC-OUTPUT-1", "Is On", true),
        point("HVAC-1", "Room Temperature", 22),
        point("PM5340-1", "Active Power", 100),
      ]),
    ]);
    expect(rows.map((r) => r.id)).toEqual([
      "BSC-1",
      "BSC-2",
      "PCS-1",
      "PCS-2",
      "PCS-3",
      "EMU-1",
      "CB-1",
      "DC-OUTPUT-1",
      "HVAC-1",
      "PM5340-1",
    ]);
    expect(rows.length).toBe(10);
  });

  it("tip önekten türetilir; snapshot cihazı online'dır", () => {
    const rows = deriveDevicesFromSnapshot([
      container("c-1", [point("PCS-1", "AC Active Power", 0)]),
    ]);
    expect(rows[0].type).toBe("pcs");
    expect(rows[0].status).toBe("online");
    expect(rows[0].protocol).toBe("ws");
    expect(rows[0].name).toBe("PCS-1");
  });

  it("bilinmeyen önek → type 'unknown'", () => {
    const rows = deriveDevicesFromSnapshot([
      container("c-1", [point("XYZ-9", "Foo", 1)]),
    ]);
    expect(rows[0].type).toBe("unknown");
  });

  it("aynı cihaz iki konteynerde → tek satır, en yeni last_seen", () => {
    const rows = deriveDevicesFromSnapshot([
      container("c-1", [point("BSC-1", "SOC", 90, "2026-08-25T10:00:00.000Z")]),
      container("c-2", [point("BSC-1", "SOC", 91, "2026-08-25T12:00:00.000Z")]),
    ]);
    expect(rows.length).toBe(1);
    expect(rows[0].last_seen).toBe("2026-08-25T12:00:00.000Z");
  });

  it("boş snapshot → boş liste", () => {
    expect(deriveDevicesFromSnapshot([])).toEqual([]);
    expect(deriveDevicesFromSnapshot([container("c-1", [])])).toEqual([]);
  });
});

describe("latestTelemetryForDevice (B3)", () => {
  it("seçili cihazın satırlarını döndürür (isim başına en yeni değer)", () => {
    const rows = latestTelemetryForDevice(
      [
        container("c-1", [
          point("PCS-1", "AC Active Power", -50, "2026-08-25T10:00:00.000Z"),
          point("PCS-1", "AC Active Power", -60, "2026-08-25T11:00:00.000Z"),
          point("PCS-1", "DC Voltage", 800),
          point("PCS-2", "AC Active Power", -10),
        ]),
      ],
      "PCS-1",
    );
    expect(rows.map((r) => r.name)).toEqual(["AC Active Power", "DC Voltage"]);
    const power = rows.find((r) => r.name === "AC Active Power");
    expect(power?.value).toBe(-60);
  });

  it("bilinmeyen cihaz → boş dizi", () => {
    expect(latestTelemetryForDevice([], "PCS-1")).toEqual([]);
  });
});
