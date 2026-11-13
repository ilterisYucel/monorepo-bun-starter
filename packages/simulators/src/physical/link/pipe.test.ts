// Pipe çekirdeği kanıtları — SPEC SIMULATOR-PIPE §6.1.
// AK-1.1 son değer · AK-1.2 mock fallback + uyarı · AK-1.3 immutability.
import { describe, expect, it, vi } from "vitest";
import {
  InMemoryTransport,
  MockTransport,
  PipeSet,
  type Signal,
} from "./pipe";

const sig = (name: string, value: unknown, tick = 0, source = "unit"): Signal => ({
  name,
  value,
  tick,
  source,
});

describe("PipeSet — UC-1", () => {
  it("AK-1.1: son değer commit sonrası okunur; aynı tick'te önceki değer görünür", () => {
    const set = new PipeSet();
    set.publish(sig("a", 1, 1));
    expect(set.read("a")).toBeUndefined(); // commit öncesi görünmez
    set.commit();
    expect(set.read("a")?.value).toBe(1);

    set.publish(sig("a", 2, 2));
    expect(set.read("a")?.value).toBe(1); // tek tick gecikme
    set.commit();
    expect(set.read("a")?.value).toBe(2);
  });

  it("AK-1.2: yayıncısız kanal mock default döner; default yoksa uyarı bir kez basılır", () => {
    const warn = vi.fn();
    const set = new PipeSet({ defaults: { "bus.energized": true }, warn });
    expect(set.read("bus.energized")?.value).toBe(true);
    expect(set.read("bus.energized")?.source).toBe("mock");
    expect(warn).not.toHaveBeenCalled();

    expect(set.read("yok.kanal")).toBeUndefined();
    expect(set.read("yok.kanal")).toBeUndefined();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith("yok.kanal");
  });

  it("AK-1.3: yayınlanan sinyal dondurulur — tüketici değişikliği kanalı bozmaz", () => {
    const set = new PipeSet();
    const signal = sig("a", { soc: 55 });
    set.publish(signal);
    set.commit();
    const read = set.read("a");
    expect(Object.isFrozen(read)).toBe(true);
    expect(() => {
      (read as { value: { soc: number } }).value.soc = 10;
    }).toThrow();
    expect((set.read("a")?.value as { soc: number }).soc).toBe(55);
  });

  it("aynı kanala iki yayıncı: commit sonrası son yazan kazanır", () => {
    const set = new PipeSet();
    set.publish(sig("a", 1, 1, "A"));
    set.publish(sig("a", 2, 1, "B"));
    set.commit();
    expect(set.read("a")?.value).toBe(2);
    expect(set.read("a")?.source).toBe("B");
  });

  it("MockTransport: yayınlar yok sayılır, default'lar PipeSet'ten gelir", () => {
    const transport = new MockTransport();
    const set = new PipeSet({ transport, defaults: { "dc.voltage": 1500 } });
    set.publish(sig("dc.voltage", 900));
    set.commit();
    expect(set.read("dc.voltage")?.value).toBe(1500);
    expect(set.read("dc.voltage")?.source).toBe("mock");
  });

  it("InMemoryTransport: bilinmeyen kanal undefined döner", () => {
    const transport = new InMemoryTransport();
    expect(transport.read("yok")).toBeUndefined();
    transport.commit();
    expect(transport.read("yok")).toBeUndefined();
  });
});
