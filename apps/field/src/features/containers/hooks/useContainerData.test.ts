import { describe, it, expect } from "vitest";
import { statusForContainer, summarizeContainer } from "./useContainerData";
import type { FieldContainer } from "../services/containersApi";

/**
 * T5.1 — konteyner kart özeti sözleşmesi:
 * - connectionStatus → kart durumu: connected→online, stale/error→warning,
 *   idle→offline; `connected` = yalnızca "connected" (stale ≠ bağlı).
 * - Kanonik metrik eşlemesi (canonical attr) + name fallback; SOC ortalaması;
 *   aktif cihaz sayımı tip bazlı (BSC güç>0, CB kapalı, DC açık, HVAC sıcak>0).
 */

function makeContainer(
  connectionStatus: FieldContainer["connectionStatus"],
  telemetry: FieldContainer["latestTelemetry"],
): FieldContainer {
  return {
    containerId: "c-1",
    layout: { x: 0, y: 0, z: 0 },
    connectionStatus,
    latestTelemetry: telemetry,
  };
}

const point = (
  deviceId: string,
  name: string,
  value: unknown,
  canonical?: string,
  rack?: string,
) => ({
  deviceId,
  name,
  value,
  description: "",
  unit: "",
  timestamp: "2026-08-25T12:00:00.000Z",
  ...(canonical || rack
    ? { tags: { ...(rack ? { rack_id: rack } : {}), ...(canonical ? { canonical } : {}) } }
    : {}),
});

describe("statusForContainer (T5.1)", () => {
  it("connected → online; stale/error → warning; idle → offline", () => {
    expect(statusForContainer("connected")).toBe("online");
    expect(statusForContainer("stale")).toBe("warning");
    expect(statusForContainer("error")).toBe("warning");
    expect(statusForContainer("idle")).toBe("offline");
  });
});

describe("summarizeContainer (T5.1)", () => {
  it("kanonik metriklerden SOC/güç toplar", () => {
    const container = makeContainer("connected", [
      point("BSC-1", "Voltage", 750, "voltage", "system"),
      point("BSC-1", "SOC", 90, "soc", "system"),
      point("BSC-1", "ChargePower", 100, "charge_power", "system"),
      point("BSC-2", "SOC", 80, "soc", "system"),
      point("BSC-2", "DischargePower", 50, "discharge_power", "system"),
    ]);
    const summary = summarizeContainer(container);
    expect(summary.status).toBe("online");
    expect(summary.connected).toBe(true);
    expect(summary.soc).toBeCloseTo(85);
    expect(summary.powerKw).toBe(150);
    expect(summary.deviceCount).toBe(2);
    expect(summary.activeDeviceCount).toBe(2);
  });

  it("canonical yoksa name fallback çalışır (system rack'iyle)", () => {
    const container = makeContainer("connected", [
      point("BSC-1", "SOC", 70, undefined, "system"),
      point("BSC-1", "Power", 30, undefined, "system"),
    ]);
    const summary = summarizeContainer(container);
    expect(summary.soc).toBe(70);
    expect(summary.powerKw).toBe(30);
  });

  it("stale → warning + connected false", () => {
    const summary = summarizeContainer(makeContainer("stale", []));
    expect(summary.status).toBe("warning");
    expect(summary.connected).toBe(false);
  });

  it("boş telemetri → sıfırlar", () => {
    const summary = summarizeContainer(makeContainer("idle", []));
    expect(summary.soc).toBeUndefined();
    expect(summary.powerKw).toBe(0);
    expect(summary.deviceCount).toBe(0);
    expect(summary.activeDeviceCount).toBe(0);
  });

  it("tip bazlı aktif sayım: CB kapalı, DC açık", () => {
    const container = makeContainer("connected", [
      point("CB-1", "Is Closed", true),
      point("CB-2", "Is Closed", false),
      point("DC-1", "Is On", true),
    ]);
    const summary = summarizeContainer(container);
    expect(summary.deviceCount).toBe(3);
    expect(summary.activeDeviceCount).toBe(2);
  });
});
