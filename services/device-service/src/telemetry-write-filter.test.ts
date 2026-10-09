import { describe, it, expect } from "vitest";
import type { TelemetryData } from "@gd-monorepo/shared-types";
import { TelemetryWriteFilter } from "./telemetry-write-filter";
import type { WritePolicy } from "./write-policy";

const tel = (name: string, value: number | boolean | string): TelemetryData => ({
  name,
  description: name,
  value,
  unit: "",
  timestamp: new Date().toISOString(),
  deviceId: "bsc-1",
});

const policy = (deadband: number, maxStaleMs: number): Map<string, WritePolicy> =>
  new Map([["SOC", { deadband, maxStaleMs }]]);

describe("TelemetryWriteFilter", () => {
  it("politikasız isim her zaman dahil (always-write)", () => {
    let now = 0;
    const f = new TelemetryWriteFilter(() => now);
    const out = f.select("bsc-1", [tel("Volt", 1)], new Map());
    expect(out.map((t) => t.name)).toEqual(["Volt"]);
    f.markWritten("bsc-1", out);
    now = 1000;
    expect(f.select("bsc-1", [tel("Volt", 1)], new Map())).toHaveLength(1);
  });

  it("ilk görüş (state yok) dahil edilir", () => {
    const f = new TelemetryWriteFilter(() => 0);
    expect(f.select("bsc-1", [tel("SOC", 50)], policy(0.5, 60000))).toHaveLength(1);
  });

  it("markWritten sonrası eşik altı değişim haric tutulur", () => {
    let now = 0;
    const f = new TelemetryWriteFilter(() => now);
    const p = policy(0.5, 60000);
    const first = f.select("bsc-1", [tel("SOC", 10)], p);
    f.markWritten("bsc-1", first);
    now = 1000;
    // 10.2 − 10 = 0.2 < 0.5 → yazılmaz
    expect(f.select("bsc-1", [tel("SOC", 10.2)], p)).toHaveLength(0);
  });

  it("eşik üstü değişim dahil edilir", () => {
    let now = 0;
    const f = new TelemetryWriteFilter(() => now);
    const p = policy(0.5, 60000);
    f.markWritten("bsc-1", f.select("bsc-1", [tel("SOC", 10)], p));
    now = 1000;
    expect(f.select("bsc-1", [tel("SOC", 10.6)], p)).toHaveLength(1);
  });

  it("TTL doldu → değişmese de dahil edilir (son yazımdan)", () => {
    let now = 0;
    const f = new TelemetryWriteFilter(() => now);
    const p = policy(0.5, 60000);
    f.markWritten("bsc-1", f.select("bsc-1", [tel("SOC", 10)], p));
    now = 59999;
    expect(f.select("bsc-1", [tel("SOC", 10)], p)).toHaveLength(0);
    now = 60000;
    expect(f.select("bsc-1", [tel("SOC", 10)], p)).toHaveLength(1);
  });

  it("sayısal olmayan değer politikalı isimde güvenli tarafta dahil edilir", () => {
    const f = new TelemetryWriteFilter(() => 0);
    const p = policy(0.5, 60000);
    f.markWritten("bsc-1", f.select("bsc-1", [tel("SOC", 10)], p));
    expect(f.select("bsc-1", [tel("SOC", true)], p)).toHaveLength(1);
  });

  it("cihazlar izole — biri diğerinin state'ini etkilemez", () => {
    const f = new TelemetryWriteFilter(() => 0);
    const p = policy(0.5, 60000);
    f.markWritten("bsc-1", f.select("bsc-1", [tel("SOC", 10)], p));
    // bsc-2 state yok → ilk görüş dahil
    expect(f.select("bsc-2", [tel("SOC", 10)], p)).toHaveLength(1);
  });

  it("girdi sırası korunur, yalnız gerekenler döner", () => {
    let now = 0;
    const f = new TelemetryWriteFilter(() => now);
    const p = new Map<string, WritePolicy>([
      ["A", { deadband: 1, maxStaleMs: 60000 }],
      ["B", { deadband: 1, maxStaleMs: 60000 }],
    ]);
    f.markWritten("bsc-1", f.select("bsc-1", [tel("A", 1), tel("B", 1)], p));
    now = 1000;
    const out = f.select("bsc-1", [tel("B", 5), tel("A", 1.1)], p);
    expect(out.map((t) => t.name)).toEqual(["B"]);
  });
});
