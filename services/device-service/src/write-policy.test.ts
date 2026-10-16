import { describe, it, expect } from "vitest";
import type { TelemetryConfigEntry } from "@gd-monorepo/shared-types";
import { resolveWritePolicies } from "./write-policy";

const intEntry = (
  extra: Partial<TelemetryConfigEntry> & { scale?: number } = {},
): TelemetryConfigEntry =>
  ({
    protocol: "MODBUS",
    name: "SOC",
    registerAddress: 30055,
    registerTableType: "INPUT_REGISTER",
    registerDataType: "UINT16",
    scale: 0.01,
    offset: 0,
    byteOrder: "BIG_ENDIAN",
    priority: 0,
    description: "SOC",
    unit: "%",
    ...extra,
  }) as TelemetryConfigEntry;

describe("resolveWritePolicies", () => {
  it("sayısal deadband + maxStaleMs çözülür", () => {
    const map = resolveWritePolicies([intEntry({ deadband: 0.5, maxStaleMs: 60000 })]);
    expect(map.get("SOC")).toEqual({ deadband: 0.5, maxStaleMs: 60000 });
  });

  it('"auto" → scale değerine çözülür', () => {
    const map = resolveWritePolicies([
      intEntry({ deadband: "auto", maxStaleMs: 60000, scale: 0.01 }),
    ]);
    expect(map.get("SOC")).toEqual({ deadband: 0.01, maxStaleMs: 60000 });
  });

  it("deadband tanımsız girdi haritaya alınmaz (always-write)", () => {
    const map = resolveWritePolicies([intEntry(), intEntry({ name: "Volt" })]);
    expect(map.size).toBe(0);
  });

  it("deadband: auto ama scale yok/sıfır → fail-fast", () => {
    expect(() =>
      resolveWritePolicies([intEntry({ deadband: "auto", maxStaleMs: 60000, scale: 0 })]),
    ).toThrow(/gecersiz politika/);
  });

  it("savunmacı: deadband var maxStaleMs yok → fail-fast", () => {
    expect(() => resolveWritePolicies([intEntry({ deadband: 0.5 })])).toThrow(
      /gecersiz politika/,
    );
  });

  it("karışık girdilerde yalnız politikalılar döner", () => {
    const map = resolveWritePolicies([
      intEntry({ name: "A", deadband: 1, maxStaleMs: 1000 }),
      intEntry({ name: "B" }),
      intEntry({ name: "C", deadband: "auto", maxStaleMs: 2000, scale: 0.1 }),
    ]);
    expect([...map.keys()].sort()).toEqual(["A", "C"]);
    expect(map.get("C")).toEqual({ deadband: 0.1, maxStaleMs: 2000 });
  });
});
