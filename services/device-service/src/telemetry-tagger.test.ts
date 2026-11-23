import { describe, it, expect } from "vitest";
import type { TelemetryData } from "@gd-monorepo/shared-types";
import { stampTags } from "./telemetry-tagger";

function sample(overrides?: Partial<TelemetryData>): TelemetryData {
  return {
    name: "SOC",
    description: "SOC",
    value: 84.1,
    unit: "%",
    timestamp: new Date().toISOString(),
    deviceId: "BSC-1",
    tags: { rack_id: "system" },
    ...overrides,
  };
}

describe("stampTags — service.json global tag'leri", () => {
  it("servis tag'lerini basar ve cihaz tag'lerini korur", () => {
    const out = stampTags([sample()], "BSC-1", { container_id: "container-1" })[0]!;

    expect(out.tags).toEqual({
      container_id: "container-1",
      rack_id: "system",
      device_id: "BSC-1",
    });
  });

  it("keyfi anahtar kümesini destekler (Telegraf tarzı)", () => {
    const out = stampTags([sample()], "PCS-1", {
      field_id: "field-1",
      customer: "polatli",
      environment: "test",
    })[0]!;

    expect(out.tags).toMatchObject({
      field_id: "field-1",
      customer: "polatli",
      environment: "test",
      device_id: "PCS-1",
    });
  });

  it("device_id ve cihaz tag'i servis tag'ini ezer", () => {
    const out = stampTags(
      [sample({ tags: { device_id: "yanlis", rack_id: "r1" } })],
      "BSC-1",
      { device_id: "servis", rack_id: "servis" },
    )[0]!;

    expect(out.tags).toEqual({ device_id: "BSC-1", rack_id: "r1" });
  });

  it("tag yoksa yalnız device_id basar", () => {
    const out = stampTags([sample({ tags: undefined })], "BSC-1")[0]!;

    expect(out.tags).toEqual({ device_id: "BSC-1" });
  });

  it("telemetri dizisini boş/tanımsız tag'lerle de işler", () => {
    expect(stampTags([], "BSC-1", { a: "b" })).toEqual([]);
    const out = stampTags([sample()], "BSC-1", {})[0]!;
    expect(out.tags).toEqual({ rack_id: "system", device_id: "BSC-1" });
  });
});
