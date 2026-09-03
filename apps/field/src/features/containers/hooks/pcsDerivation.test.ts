import { describe, it, expect } from "vitest";
import type { TelemetryData } from "@gd-monorepo/shared-types";
import {
  derivePcsSummary,
  pcsState,
  pcsTelemetryValue,
  pcsConfigInfo,
} from "./pcsDerivation";

/**
 * pcsDerivation sözleşmesi (2026-08-30 — konteyner başına TEK PCS):
 * - derivePcsSummary: PCS- önekli cihazlar arasından sıralı İLKİ kazanır
 *   (1 konteyner = 1 PCS); PCS yoksa undefined; telemetri yalnız o cihaza
 *   filtrelenir.
 * - pcsState: bağlantı kopuksa "offline"; işaretli AC aktif güce göre
 *   charging/discharging/idle; statusKey i18n anahtarıdır.
 * - pcsTelemetryValue: name ile ilk sayısal satır; yoksa/sayısal değilse 0.
 * - pcsConfigInfo: config modal'ı girdisi — envanter unique + sıralı.
 */

function point(deviceId: string, name: string, value: unknown): TelemetryData {
  return {
    deviceId,
    name,
    value,
    description: "",
    unit: "",
    timestamp: "2026-08-30T12:00:00.000Z",
  };
}

describe("derivePcsSummary", () => {
  it("tek PCS cihazı için özet döner (bağlantı + filtrelenmiş telemetri)", () => {
    const summary = derivePcsSummary("c-1", "c-1", true, [
      point("PCS-1", "AC Active Power", -42),
      point("PCS-1", "DC Voltage", 745),
      point("BSC-1", "SOC", 88),
    ]);
    expect(summary).toBeDefined();
    expect(summary?.pcsId).toBe("PCS-1");
    expect(summary?.containerId).toBe("c-1");
    expect(summary?.connected).toBe(true);
    expect(summary?.latestTelemetry.map((x) => x.deviceId)).toEqual([
      "PCS-1",
      "PCS-1",
    ]);
  });

  it("PCS cihazı yoksa undefined döner", () => {
    expect(
      derivePcsSummary("c-1", "c-1", true, [point("BSC-1", "SOC", 88)]),
    ).toBeUndefined();
  });

  it("birden fazla PCS varsa sıralı ilki kazanır (1 konteyner = 1 PCS)", () => {
    const summary = derivePcsSummary("c-1", "c-1", true, [
      point("PCS-2", "AC Active Power", 10),
      point("PCS-1", "AC Active Power", -10),
    ]);
    expect(summary?.pcsId).toBe("PCS-1");
    expect(summary?.latestTelemetry).toHaveLength(1);
  });

  it("bağlantı durumu parametreden taşınır", () => {
    const summary = derivePcsSummary("c-1", "c-1", false, [
      point("PCS-1", "AC Active Power", 0),
    ]);
    expect(summary?.connected).toBe(false);
  });
});

describe("pcsState", () => {
  it("bağlantı yok → offline", () => {
    expect(pcsState(false, -5)).toEqual({
      kind: "offline",
      statusKey: "common.offline",
    });
  });

  it("negatif aktif güç → charging", () => {
    expect(pcsState(true, -5)).toEqual({
      kind: "charging",
      statusKey: "status.charging",
    });
  });

  it("pozitif aktif güç → discharging", () => {
    expect(pcsState(true, 5)).toEqual({
      kind: "discharging",
      statusKey: "status.discharging",
    });
  });

  it("sıfır aktif güç → idle", () => {
    expect(pcsState(true, 0)).toEqual({
      kind: "idle",
      statusKey: "status.idleMode",
    });
  });
});

describe("pcsTelemetryValue", () => {
  it("mevcut sayısal satırı döner", () => {
    expect(
      pcsTelemetryValue(
        [point("PCS-1", "DC Voltage", 745), point("PCS-1", "DC Current", 12)],
        "DC Voltage",
      ),
    ).toBe(745);
  });

  it("eksik satır → 0", () => {
    expect(pcsTelemetryValue([point("PCS-1", "DC Voltage", 745)], "PF")).toBe(0);
  });

  it("sayısal olmayan değer → 0", () => {
    expect(
      pcsTelemetryValue([point("PCS-1", "Is On", true)], "Is On"),
    ).toBe(0);
  });

  it("boş telemetri → 0", () => {
    expect(pcsTelemetryValue([], "DC Voltage")).toBe(0);
  });
});

describe("pcsConfigInfo", () => {
  it("envanter unique + sıralı üretir; bağlantı meta bilgilerini taşır", () => {
    const pcs = {
      pcsId: "PCS-1",
      containerId: "c-1",
      containerName: "c-1",
      connected: true,
      latestTelemetry: [
        point("PCS-1", "DC Current", 12),
        point("PCS-1", "AC Active Power", -42),
        point("PCS-1", "DC Current", 14),
      ],
    };
    const info = pcsConfigInfo(
      pcs,
      "2026-08-30T12:00:00.000Z",
      { x: 1, y: 2, z: 3 },
    );
    expect(info.pcsId).toBe("PCS-1");
    expect(info.containerId).toBe("c-1");
    expect(info.connected).toBe(true);
    expect(info.lastSeenAt).toBe("2026-08-30T12:00:00.000Z");
    expect(info.layout).toEqual({ x: 1, y: 2, z: 3 });
    expect(info.telemetryNames).toEqual(["AC Active Power", "DC Current"]);
  });

  it("opsiyonel alanlar undefined kalabilir", () => {
    const pcs = {
      pcsId: "PCS-1",
      containerId: "c-1",
      containerName: "c-1",
      connected: false,
      latestTelemetry: [],
    };
    const info = pcsConfigInfo(pcs);
    expect(info.lastSeenAt).toBeUndefined();
    expect(info.layout).toBeUndefined();
    expect(info.telemetryNames).toEqual([]);
  });
});
