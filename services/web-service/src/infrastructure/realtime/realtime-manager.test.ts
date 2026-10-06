import { describe, it, expect, vi } from "vitest";
import { RealtimeManager } from "./realtime-manager";
import type { RedisConnection } from "@gd-monorepo/core";

/**
 * RealtimeManager ring buffer sözleşmesi (Faz 5.1 — B1):
 *
 * - `writeBatchToRingBuffer`: bir okuma partisinin TÜM kayıtları buffer'da
 *   kalır — parti, RING_BUFFER_MAX'tan büyük olsa bile trim parti boyutuna
 *   genişler (B1 regresyonu: 300'de kesilince SOC/voltage gibi listenin
 *   başındaki isimler kayboluyordu — field snapshot'ı canonical'sız kalıyordu).
 * - Küçük partilerde trim RING_BUFFER_MAX'ta kalır (birden çok parti korunur).
 * - `ringBuffer`: en-yeni-önce sıralı, JSON parse'lı döner.
 * - `broadcast`: yalnızca OPEN soketlere JSON gönderir.
 * - subscribe/unsubscribe/unsubscribeAll: abone defteri tutarlılığı.
 */
describe("RealtimeManager (Faz 5.1 B1)", () => {
  function makeRedis() {
    const lists = new Map<string, string[]>();
    const client = {
      lPush: vi.fn(async (key: string, items: string[] | string) => {
        const list = lists.get(key) ?? [];
        const incoming = Array.isArray(items) ? items : [items];
        // redis lPush: her eleman listenin BAŞINA eklenir — sonuç ters sıra
        lists.set(key, [...incoming].reverse().concat(list));
        return incoming.length + list.length;
      }),
      lTrim: vi.fn(async (key: string, start: number, stop: number) => {
        const list = lists.get(key);
        if (!list) return "OK";
        lists.set(key, list.slice(start, stop + 1));
        return "OK";
      }),
      expire: vi.fn(async () => true),
      lRange: vi.fn(async (key: string) => lists.get(key) ?? []),
    };
    return { client, lists };
  }

  function makeManager(client: unknown): RealtimeManager {
    return new RealtimeManager({
      client: () => client,
    } as unknown as RedisConnection);
  }

  const point = (deviceId: string, name: string, value: number) => ({
    deviceId,
    name,
    value,
    timestamp: new Date().toISOString(),
  });

  it("büyük parti (isim sayısı > RING_BUFFER_MAX) tamamen korunur — B1 regresyonu", async () => {
    const { client, lists } = makeRedis();
    const manager = makeManager(client);
    const batch = Array.from({ length: 960 }, (_, i) =>
      point("BSC-1", `Name-${i}`, i),
    );
    await manager.writeBatchToRingBuffer("BSC-1", batch);

    expect(client.lTrim).toHaveBeenCalledWith(
      "device:BSC-1:buffer",
      0,
      expect.any(Number),
    );
    const stored = lists.get("device:BSC-1:buffer")!;
    expect(stored).toHaveLength(960);
    const names = new Set(stored.map((s) => JSON.parse(s).name));
    expect(names.size).toBe(960);
    expect(names.has("Name-0")).toBe(true); // listenin BAŞIndaki isim kaybolmaz
    expect(names.has("Name-959")).toBe(true); // kuyruk da durur
  });

  it("küçük partiler RING_BUFFER_MAX'ta kesilir (geçmiş korunur)", async () => {
    const { client, lists } = makeRedis();
    const manager = makeManager(client);
    for (let b = 0; b < 7; b++) {
      const batch = Array.from({ length: 50 }, (_, i) =>
        point("DC-1", `Name-${b}-${i}`, i),
      );
      await manager.writeBatchToRingBuffer("DC-1", batch);
    }
    const stored = lists.get("device:DC-1:buffer")!;
    // lTrim(0, RING_BUFFER_MAX=299) → 300 eleman (indeksler dahil)
    expect(stored.length).toBe(300);
  });

  it("tek kayıt writeToRingBuffer trim sınırında kalır", async () => {
    const { client, lists } = makeRedis();
    const manager = makeManager(client);
    await manager.writeToRingBuffer("PCS-1", point("PCS-1", "Power", 50));
    expect(lists.get("device:PCS-1:buffer")!).toHaveLength(1);
    expect(client.expire).toHaveBeenCalledWith("device:PCS-1:buffer", 300);
  });

  it("ringBuffer en-yeni-önce sıralı JSON nesneleri döner", async () => {
    const { client } = makeRedis();
    const manager = makeManager(client);
    await manager.writeToRingBuffer("BSC-1", point("BSC-1", "Voltage", 750));
    await manager.writeToRingBuffer("BSC-1", point("BSC-1", "Voltage", 745));
    const buffer = await manager.ringBuffer("BSC-1");
    expect(buffer).toHaveLength(2);
    expect((buffer[0] as { value: number }).value).toBe(745);
    expect((buffer[1] as { value: number }).value).toBe(750);
  });

  it("ringBuffer bozuk JSON'u ham string olarak döndürür", async () => {
    const { client, lists } = makeRedis();
    lists.set("device:BSC-1:buffer", ["not-json"]);
    const manager = makeManager(client);
    const buffer = await manager.ringBuffer("BSC-1");
    expect(buffer).toEqual(["not-json"]);
  });

  it("broadcast yalnızca OPEN soketlere JSON gönderir", () => {
    const { client } = makeRedis();
    const manager = makeManager(client);
    const open = { readyState: 1, OPEN: 1, CLOSED: 3, CLOSING: 2, send: vi.fn() };
    const closed = { readyState: 3, OPEN: 1, CLOSED: 3, CLOSING: 2, send: vi.fn() };
    manager.subscribe("BSC-1", open as never);
    manager.subscribe("BSC-1", closed as never);
    manager.broadcast("BSC-1", { type: "telemetry", value: 1 });
    expect(open.send).toHaveBeenCalledWith('{"type":"telemetry","value":1}');
    expect(closed.send).not.toHaveBeenCalled();
  });

  it("subscribe/unsubscribe abone defterini tutarlı tutar", () => {
    const { client } = makeRedis();
    const manager = makeManager(client);
    const a = { readyState: 1, OPEN: 1, CLOSED: 3, CLOSING: 2 } as never;
    const b = { readyState: 1, OPEN: 1, CLOSED: 3, CLOSING: 2 } as never;
    manager.subscribe("BSC-1", a);
    manager.subscribe("BSC-1", b);
    expect(manager.subscriberCount("BSC-1")).toBe(2);
    manager.unsubscribe("BSC-1", a);
    expect(manager.subscriberCount("BSC-1")).toBe(1);
    manager.unsubscribeAll(b);
    expect(manager.subscriberCount()).toBe(0);
  });
});

/**
 * İsim filtresi (panel spec) — `subscribe(deviceId, ws, names?)`:
 * socket başına yalnız istenen telemetri isimleri yollanır; `initial` snapshot
 * istenen isimlerin EN YENİSİDİR. names yoksa eski davranış (tüm satırlar).
 */
describe("RealtimeManager — isim filtresi (panel spec)", () => {
  function makeFilterRedis() {
    const lists = new Map<string, string[]>();
    const client = {
      lPush: vi.fn(async (key: string, ...values: unknown[]) => {
        const list = lists.get(key) ?? [];
        for (const v of (values.flat() as string[])) list.unshift(v);
        lists.set(key, list);
        return list.length;
      }),
      lTrim: vi.fn(async () => "OK"),
      expire: vi.fn(async () => true),
      lRange: vi.fn(async (key: string) => lists.get(key) ?? []),
    };
    return { client, lists };
  }
  function makeFilterManager(client: unknown): RealtimeManager {
    return new RealtimeManager({ client: () => client } as unknown as RedisConnection);
  }
  const openWs = () => ({ readyState: 1, OPEN: 1, CLOSED: 3, CLOSING: 2, send: vi.fn() });

  it("names ile broadcast yalnız istenen isimleri yollar", () => {
    const { client } = makeFilterRedis();
    const manager = makeFilterManager(client);
    const ws = openWs();
    manager.subscribe("BSC-1", ws as never, ["SOC"]);

    manager.broadcast("BSC-1", {
      type: "telemetry",
      deviceId: "BSC-1",
      data: [
        { name: "SOC", value: 80 },
        { name: "Voltage", value: 700 },
      ],
    });

    expect(ws.send).toHaveBeenCalledTimes(1);
    const msg = JSON.parse(ws.send.mock.calls[0]![0] as string);
    expect(msg.data.map((r: { name: string }) => r.name)).toEqual(["SOC"]);
  });

  it("names yoksa tüm satırlar gider (geriye uyumlu)", () => {
    const { client } = makeFilterRedis();
    const manager = makeFilterManager(client);
    const ws = openWs();
    manager.subscribe("BSC-1", ws as never);
    manager.broadcast("BSC-1", { type: "telemetry", data: [{ name: "SOC" }, { name: "Voltage" }] });
    expect(JSON.parse(ws.send.mock.calls[0]![0] as string).data).toHaveLength(2);
  });

  it("eşleşen isim yoksa gönderim atlanır", () => {
    const { client } = makeFilterRedis();
    const manager = makeFilterManager(client);
    const ws = openWs();
    manager.subscribe("BSC-1", ws as never, ["Yok"]);
    manager.broadcast("BSC-1", { type: "telemetry", data: [{ name: "SOC" }] });
    expect(ws.send).not.toHaveBeenCalled();
  });

  it("sendInitialData yalnız istenen isimlerin en yenisini yollar", async () => {
    const { client } = makeFilterRedis();
    const manager = makeFilterManager(client);
    const ws = openWs();
    manager.subscribe("BSC-1", ws as never, ["SOC"]);
    await manager.writeBatchToRingBuffer("BSC-1", [
      { name: "SOC", value: 1, timestamp: "2026-10-05T10:00:00.000Z" },
      { name: "SOC", value: 9, timestamp: "2026-10-05T10:00:05.000Z" },
      { name: "Voltage", value: 700, timestamp: "2026-10-05T10:00:05.000Z" },
    ]);
    await manager.sendInitialData("BSC-1", ws as never);

    const msg = JSON.parse(ws.send.mock.calls[0]![0] as string);
    expect(msg.type).toBe("initial");
    expect(msg.data).toHaveLength(1);
    expect(msg.data[0]).toMatchObject({ name: "SOC", value: 9 });
  });
});
