import { describe, it, expect, vi } from "vitest";
import { RealtimeSnapshotSource } from "./realtime-snapshot-source";
import type { ISqlDatabase } from "@gd-monorepo/core";

import type { RealtimeManager } from "../../realtime/realtime-manager";
import type { TelemetryData } from "@gd-monorepo/shared-types";


/**
 * RealtimeSnapshotSource sözleşmesi:
 * devices tablosundan (status='online') cihaz listesi + her cihazın Redis ring
 * buffer'ı. Buffer en-yeni-önce sıralıdır (lPush); (deviceId, name) başına
 * EN YENİ değer korunur (ilk görülen = en yeni). Bozuk/eksik alanlı kayıtlar
 * elenir; SQL/Redis hatası → boş dizi (kademeli bozulma — bağlantı etkilenmez).
 */

describe("RealtimeSnapshotSource (T2.1c)", () => {
  const points = (deviceId: string, name: string, value: number, timestamp: string): TelemetryData => ({
    deviceId,
    name,
    value,
    description: "",
    unit: "",
    timestamp,
  });

  function makeSql(devices: Array<{ id: string }>): ISqlDatabase {
    return {
      query: vi.fn().mockResolvedValue(devices),
      queryOne: vi.fn().mockResolvedValue(undefined),
      execute: vi.fn().mockResolvedValue(undefined),
      connect: vi.fn(),
      disconnect: vi.fn(),
      health: vi.fn().mockResolvedValue(true),
    };
  }

  function makeRealtime(
    buffers: Record<string, unknown[] | Error>,
  ): RealtimeManager {
    return {
      ringBuffer: vi.fn().mockImplementation(async (deviceId: string) => {
        const v = buffers[deviceId];
        if (v instanceof Error) throw v;
        return v;
      }),
    } as unknown as RealtimeManager;
  }

  it("her cihazın en yeni değerlerini döndürür", async () => {
    const sql = makeSql([{ id: "bsc-1" }, { id: "pcs-1" }]);
    const realtime = makeRealtime({
      "bsc-1": [
        points("bsc-1", "Voltage", 750, "t3"),
        points("bsc-1", "Current", 100, "t3"),
        points("bsc-1", "Voltage", 745, "t2"),
      ],
      "pcs-1": [points("pcs-1", "Power", 50, "t3")],
    });
    const source = new RealtimeSnapshotSource(sql, realtime);
    const result = await source.snapshot();
    expect(result).toEqual([
      points("bsc-1", "Voltage", 750, "t3"),
      points("bsc-1", "Current", 100, "t3"),
      points("pcs-1", "Power", 50, "t3"),
    ]);
  });

  it("(deviceId, name) başına ilk görülen (en yeni) korunur", async () => {
    const sql = makeSql([{ id: "bsc-1" }]);
    const realtime = makeRealtime({
      "bsc-1": [
        points("bsc-1", "Voltage", 750, "t3"),
        points("bsc-1", "Voltage", 745, "t2"),
        points("bsc-1", "Voltage", 740, "t1"),
      ],
    });
    const source = new RealtimeSnapshotSource(sql, realtime);
    const result = await source.snapshot();
    expect(result).toHaveLength(1);
    expect(result[0].value).toBe(750);
  });

  it("bozuk kayıtları eler", async () => {
    const sql = makeSql([{ id: "bsc-1" }]);
    const realtime = makeRealtime({
      "bsc-1": [
        { name: "Voltage", value: 1 }, // deviceId yok
        null,
        "str",
        points("bsc-1", "Voltage", 750, "t3"),
      ],
    });
    const source = new RealtimeSnapshotSource(sql, realtime);
    const result = await source.snapshot();
    expect(result).toEqual([points("bsc-1", "Voltage", 750, "t3")]);
  });

  it("SQL hatası → boş dizi (kademeli bozulma)", async () => {
    const sql = makeSql([]);
    (sql.query as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("db down"));
    const realtime = makeRealtime({});
    const source = new RealtimeSnapshotSource(sql, realtime);
    expect(await source.snapshot()).toEqual([]);
  });

  it("tek cihazın Redis hatası diğerlerini etkilemez", async () => {
    const sql = makeSql([{ id: "bsc-1" }, { id: "pcs-1" }]);
    const realtime = makeRealtime({
      "bsc-1": new Error("redis down"),
      "pcs-1": [points("pcs-1", "Power", 50, "t3")],
    });
    const source = new RealtimeSnapshotSource(sql, realtime);
    const result = await source.snapshot();
    expect(result).toEqual([points("pcs-1", "Power", 50, "t3")]);
  });

  it("cihaz yoksa boş dizi döner", async () => {
    const sql = makeSql([]);
    const realtime = makeRealtime({});
    const source = new RealtimeSnapshotSource(sql, realtime);
    expect(await source.snapshot()).toEqual([]);
  });
});
