import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import type { TelemetryData } from "@gd-monorepo/shared-types";
import { useContainerTelemetry } from "./useContainerTelemetry";
import { containersApi } from "../services/containersApi";
import type { FieldContainer } from "../services/containersApi";

/**
 * useContainerTelemetry sözleşmesi (2026-08-30 — T2):
 * - telemetry: list query'den konteyner snapshot'ı bulunur; series query
 *   120 nokta ister (30 sn refetch); konteyner yoksa undefined.
 * - 2026-09-02: useContainerSparkline kaldırıldı (Panel sparkline kartları
 *   SummaryCard/PCS bölümüne dönüştü) — sözleşme yalnızca bu hook'u kapsar.
 */

vi.mock("../services/containersApi", () => ({
  containersApi: {
    list: vi.fn(),
    timeSeries: vi.fn(),
    openSession: vi.fn(),
    endSession: vi.fn(),
    register: vi.fn(),
  },
}));

function wrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

const point = (deviceId: string, name: string, value: number, canonical?: string): TelemetryData => ({
  deviceId,
  name,
  description: "",
  value,
  unit: "",
  timestamp: "2026-08-30T12:00:00.000Z",
  ...(canonical ? { tags: { canonical } } : {}),
});

const container = (id: string, telemetry: TelemetryData[]): FieldContainer => ({
  containerId: id,
  layout: { x: 0, y: 0, z: 0 },
  connectionStatus: "connected",
  latestTelemetry: telemetry,
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useContainerTelemetry (T2)", () => {
  it("list'ten konteyner snapshot'ını bulur; series 120 nokta ister", async () => {
    vi.mocked(containersApi.list).mockResolvedValue([
      container("c-1", [point("BSC-1", "SOC", 88)]),
    ]);
    vi.mocked(containersApi.timeSeries).mockResolvedValue([]);

    const { result } = renderHook(
      () => useContainerTelemetry("f-1", "c-1"),
      { wrapper: wrapper() },
    );

    await waitFor(() => expect(result.current.container).toBeDefined());
    expect(result.current.container?.containerId).toBe("c-1");
    expect(result.current.latest).toHaveLength(1);
    expect(containersApi.timeSeries).toHaveBeenCalledWith("f-1", "c-1", 120);
  });

  it("konteyner listede yoksa container undefined", async () => {
    vi.mocked(containersApi.list).mockResolvedValue([container("c-2", [])]);
    vi.mocked(containersApi.timeSeries).mockResolvedValue([]);

    const { result } = renderHook(
      () => useContainerTelemetry("f-1", "yok"),
      { wrapper: wrapper() },
    );

    await waitFor(() => expect(containersApi.list).toHaveBeenCalled());
    expect(result.current.container).toBeUndefined();
    expect(result.current.latest).toEqual([]);
  });
});
