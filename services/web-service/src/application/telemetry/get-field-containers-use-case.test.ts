import { describe, it, expect, vi } from "vitest";
import type { IContaTelemetryPort } from "../../domain/ports/container-telemetry";
import { GetFieldContainersUseCase } from "./get-field-containers-use-case";

const TELEMETRY = [{ deviceId: "BSC-1", name: "SOC", value: 50 }] as never[];

function makePort(overrides: Partial<IContaTelemetryPort> = {}): IContaTelemetryPort {
  return {
    containerIds: () => ["c-1"],
    latestTelemetry: vi.fn(() => []),
    latestQuery: vi.fn(async () => []),
    historical: vi.fn(async () => []),
    allHistorical: vi.fn(async () => ({})),
    connectionStatus: () => new Map([["c-1", "connected" as const]]),
    lastSeenAt: () => 1756116000000,
    ...overrides,
  };
}

describe("GetFieldContainersUseCase", () => {
  it("taze snapshot doluysa onu kullanır; lastSeenAt ISO döner", async () => {
    const port = makePort({ latestQuery: vi.fn(async () => TELEMETRY) });
    const rows = await new GetFieldContainersUseCase(port).execute();
    expect(rows).toEqual([
      {
        containerId: "c-1",
        connectionStatus: "connected",
        lastSeenAt: new Date(1756116000000).toISOString(),
        latestTelemetry: TELEMETRY,
      },
    ]);
  });

  it("taze snapshot boşsa cache'teki son değere düşer", async () => {
    const port = makePort({ latestTelemetry: vi.fn(() => TELEMETRY) });
    const rows = await new GetFieldContainersUseCase(port).execute();
    expect(rows[0]?.latestTelemetry).toEqual(TELEMETRY);
  });

  it("bir konteynerin hatası diğerlerini engellemez", async () => {
    const port = makePort({
      containerIds: () => ["c-1", "c-2"],
      latestQuery: vi.fn(async (id: string) => {
        if (id === "c-2") throw new Error("hub down");
        return TELEMETRY;
      }),
    });
    const rows = await new GetFieldContainersUseCase(port).execute();
    expect(rows.map((r) => r.containerId)).toEqual(["c-1"]);
  });

  it("executeCached dış sorgu yapmaz (özet ekranı)", async () => {
    const port = makePort({ latestTelemetry: vi.fn(() => TELEMETRY) });
    const rows = await new GetFieldContainersUseCase(port).executeCached();
    expect(port.latestQuery).not.toHaveBeenCalled();
    expect(rows[0]?.latestTelemetry).toEqual(TELEMETRY);
  });
});
