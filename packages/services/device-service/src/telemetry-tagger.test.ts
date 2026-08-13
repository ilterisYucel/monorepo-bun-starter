import { describe, it, expect } from "vitest";
import type { TelemetryData } from "@gd-monorepo/shared-types";
import { TelemetryTagger } from "./telemetry-tagger";

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

describe("TelemetryTagger", () => {
  it("korur elle girilen tag'leri ve device_id ekler", () => {
    const tagger = new TelemetryTagger({ deviceId: "BSC-1" });
    const out = tagger.enrich([sample()])[0]!;

    expect(out.tags).toEqual({ rack_id: "system", device_id: "BSC-1" });
  });

  it("container-level app'te container_id ekler", () => {
    const tagger = new TelemetryTagger({ deviceId: "BSC-1", containerId: "container-1" });
    const out = tagger.enrich([sample()])[0]!;

    expect(out.tags).toEqual({
      rack_id: "system",
      device_id: "BSC-1",
      container_id: "container-1",
    });
  });

  it("field-level app'te field_id ekler, container_id eklemez", () => {
    const tagger = new TelemetryTagger({ deviceId: "PCS-1", fieldId: "field-1" });
    const out = tagger.enrich([sample({ deviceId: "PCS-1" })])[0]!;

    expect(out.tags).toEqual({
      rack_id: "system",
      device_id: "PCS-1",
      field_id: "field-1",
    });
  });

  it("kimlik yoksa sadece device_id ekler", () => {
    const tagger = new TelemetryTagger({ deviceId: "BSC-1" });
    const out = tagger.enrich([sample()])[0]!;

    expect(out.tags?.container_id).toBeUndefined();
    expect(out.tags?.field_id).toBeUndefined();
  });

  it("tags olmayan telemetriye de tag ekler", () => {
    const tagger = new TelemetryTagger({ deviceId: "BSC-1" });
    const out = tagger.enrich([sample({ tags: undefined })])[0]!;

    expect(out.tags).toEqual({ device_id: "BSC-1" });
  });
});
