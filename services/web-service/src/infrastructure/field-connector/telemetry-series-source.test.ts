import { describe, it, expect, vi } from "vitest";
import { TelemetrySeriesSource } from "./telemetry-series-source";
import type { DeviceRegistry } from "../../persistence/device-registry";
import type { ITimeseriesDatabase } from "@gd-monorepo/core";
import type { TelemetryData } from "@gd-monorepo/shared-types";

/**
 * TelemetrySeriesSource sözleşmesi (Faz 5.1 B2):
 *
 * - Registry çevrimiçi cihazlarla tazelenir; `deviceIds` filtresi uygulanır.
 * - Her cihaz için `getDownsampledData` çağrılır (from/to/points/names taşınır).
 * - Tek cihaz hatası diğerlerini etkilemez (allSettled); tümü hatalıysa boş.
 * - `deviceIds` verilmezse çevrimiçi TÜM cihazlar sorgulanır.
 */
describe("TelemetrySeriesSource (Faz 5.1 B2)", () => {
  const point = (deviceId: string, name: string): TelemetryData => ({
    deviceId,
    name,
    value: 2,
    unit: "",
    timestamp: "2026-08-25T10:00:00.000Z",
  });

  function makeRegistry(online: Array<{ id: string }>): DeviceRegistry {
    return {
      refresh: vi.fn().mockResolvedValue(undefined),
      online: vi.fn().mockReturnValue(online),
    } as unknown as DeviceRegistry;
  }

  function makeTimescale(
    responses: Record<string, TelemetryData[] | Error>,
  ): ITimeseriesDatabase {
    return {
      getDownsampledData: vi.fn(async (opts: { deviceId: string }) => {
        const r = responses[opts.deviceId];
        if (r instanceof Error) throw r;
        return r ?? [];
      }),
    } as unknown as ITimeseriesDatabase;
  }

  it("çevrimiçi cihazlarda downsampled sorgular ve birleştirir", async () => {
    const registry = makeRegistry([{ id: "BSC-1" }, { id: "PCS-1" }]);
    const timescale = makeTimescale({
      "BSC-1": [point("BSC-1", "BSC SOC")],
      "PCS-1": [point("PCS-1", "AC Active Power")],
    });
    const source = new TelemetrySeriesSource(registry, timescale);
    const result = await source.series({
      from: new Date("2026-08-25T00:00:00Z"),
      to: new Date("2026-08-25T12:00:00Z"),
      points: 60,
      names: ["BSC SOC", "AC Active Power"],
    });
    expect(result).toHaveLength(2);
    expect(timescale.getDownsampledData).toHaveBeenCalledTimes(2);
    expect(timescale.getDownsampledData).toHaveBeenCalledWith({
      deviceId: "BSC-1",
      from: new Date("2026-08-25T00:00:00Z"),
      to: new Date("2026-08-25T12:00:00Z"),
      points: 60,
      names: ["BSC SOC", "AC Active Power"],
    });
  });

  it("deviceIds filtresi uygulanır", async () => {
    const registry = makeRegistry([{ id: "BSC-1" }, { id: "BSC-2" }]);
    const timescale = makeTimescale({ "BSC-2": [point("BSC-2", "SOC")] });
    const source = new TelemetrySeriesSource(registry, timescale);
    await source.series({
      from: new Date(),
      to: new Date(),
      points: 60,
      deviceIds: ["BSC-2"],
    });
    expect(timescale.getDownsampledData).toHaveBeenCalledTimes(1);
    expect(timescale.getDownsampledData).toHaveBeenCalledWith(
      expect.objectContaining({ deviceId: "BSC-2" }),
    );
  });

  it("tek cihaz hatası diğer sonuçları etkilemez", async () => {
    const registry = makeRegistry([{ id: "BSC-1" }, { id: "PCS-1" }]);
    const timescale = makeTimescale({
      "BSC-1": new Error("tablo yok"),
      "PCS-1": [point("PCS-1", "Power")],
    });
    const source = new TelemetrySeriesSource(registry, timescale);
    const result = await source.series({
      from: new Date(),
      to: new Date(),
      points: 60,
    });
    expect(result).toEqual([point("PCS-1", "Power")]);
  });

  it("tüm cihazlar hatalıysa boş dizi döner", async () => {
    const registry = makeRegistry([{ id: "BSC-1" }]);
    const timescale = makeTimescale({ "BSC-1": new Error("db down") });
    const source = new TelemetrySeriesSource(registry, timescale);
    const result = await source.series({
      from: new Date(),
      to: new Date(),
      points: 60,
    });
    expect(result).toEqual([]);
  });
});
