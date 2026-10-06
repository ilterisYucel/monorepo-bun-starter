import { describe, it, expect } from "vitest";
import { dedupeLatest, telemetryKey } from "./dedupeLatest";
import type { TelemetryData } from "@gd-monorepo/shared-types";

function row(overrides: Partial<TelemetryData>): TelemetryData {
  return {
    deviceId: "BSC-1",
    name: "SOC",
    value: 50,
    unit: "%",
    description: "",
    timestamp: "2026-10-05T10:00:00.000Z",
    ...overrides,
  } as TelemetryData;
}

describe("dedupeLatest — en yeni kazanır", () => {
  it("aynı (deviceId,name,rack_id) için yalnız en yeni satırı tutar", () => {
    const old = row({ value: 0, timestamp: "2026-10-05T10:00:00.000Z" });
    const neu = row({ value: 80, timestamp: "2026-10-05T10:00:05.000Z" });
    const result = dedupeLatest([neu, old]); // yeni→eski sırada gelse de
    expect(result).toHaveLength(1);
    expect(result[0]!.value).toBe(80);
  });

  it("rack_id farklıysa ayrı anahtar (farklı rack'ler korunur)", () => {
    const system = row({ tags: { rack_id: "system" } });
    const rack1 = row({ tags: { rack_id: "1" } });
    expect(dedupeLatest([system, rack1])).toHaveLength(2);
  });

  it("telemetryKey rack_id içerir", () => {
    expect(telemetryKey(row({ tags: { rack_id: "7" } }))).toBe("BSC-1|SOC|7");
  });
});
