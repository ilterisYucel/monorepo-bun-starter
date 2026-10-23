import { describe, it, expect, vi } from "vitest";
import type { IContaTelemetryPort } from "../../domain/ports/container-telemetry";
import { GetContainerTelemetryUseCase } from "./get-container-telemetry-use-case";

const TELEMETRY = [{ deviceId: "BSC-1", name: "SOC", value: 50 }] as never[];
const WINDOW = {
  from: new Date("2026-10-22T00:00:00Z"),
  to: new Date("2026-10-22T01:00:00Z"),
  points: 60,
};

function makePort(overrides: Partial<IContaTelemetryPort> = {}): IContaTelemetryPort {
  return {
    containerIds: () => ["c-1", "c-2"],
    latestTelemetry: vi.fn((id: string) => (id === "c-1" ? TELEMETRY : [])),
    latestQuery: vi.fn(async () => []),
    historical: vi.fn(async () => []),
    allHistorical: vi.fn(async () => ({ "c-1": TELEMETRY })),
    connectionStatus: () => new Map(),
    lastSeenAt: () => undefined,
    ...overrides,
  };
}

describe("GetContainerTelemetryUseCase", () => {
  it("latestSnapshot tüm konteyner kimliklerini anahtarlar", () => {
    const snapshot = new GetContainerTelemetryUseCase(makePort()).latestSnapshot();
    expect(snapshot).toEqual({ "c-1": TELEMETRY, "c-2": [] });
  });

  it("downsampled portun allHistorical'ine delege eder", async () => {
    const port = makePort();
    const result = await new GetContainerTelemetryUseCase(port).downsampled(
      ["c-1"],
      WINDOW,
    );
    expect(port.allHistorical).toHaveBeenCalledWith(["c-1"], WINDOW);
    expect(result).toEqual({ "c-1": TELEMETRY });
  });

  it("historical yoksa boş dizi döner", async () => {
    const port = makePort({ allHistorical: vi.fn(async () => ({})) });
    await expect(
      new GetContainerTelemetryUseCase(port).historical("c-9", WINDOW),
    ).resolves.toEqual([]);
  });

  it("knownContainerIds porttan gelir", () => {
    expect(new GetContainerTelemetryUseCase(makePort()).knownContainerIds()).toEqual([
      "c-1",
      "c-2",
    ]);
  });
});
