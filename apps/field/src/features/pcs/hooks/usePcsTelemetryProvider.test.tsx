import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import type { TelemetryData } from "@gd-monorepo/shared-types";
import { usePcsTelemetryProvider } from "./usePcsTelemetryProvider";
import { containersApi } from "../../containers/services/containersApi";

/**
 * usePcsTelemetryProvider sözleşmesi (2026-09-02 — PCS sayfası grafiği):
 * - Konteynerin tarihsel serisini ister (containersApi.timeSeries),
 *   yanıtı pcsId'ye göre filtreler (yalnız o PCS'in satırları).
 * - Varsayılan: range "1h", points 200; from/to farkı range'e eşittir.
 */

vi.mock("../../containers/services/containersApi", () => ({
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

const point = (deviceId: string, name: string, value: number): TelemetryData => ({
  deviceId,
  name,
  value,
  description: "",
  unit: "",
  timestamp: "2026-09-02T12:00:00.000Z",
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("usePcsTelemetryProvider (2026-09-02)", () => {
  it("seriyi ister ve yalnız pcsId satırlarını döndürür", async () => {
    vi.mocked(containersApi.timeSeries).mockResolvedValue([
      point("PCS-1", "AC Active Power", -40),
      point("PCS-1", "DC Voltage", 800),
      point("BSC-1", "BSC SOC", 50),
    ]);

    const { result } = renderHook(
      () => usePcsTelemetryProvider("f-1", "c-1", "PCS-1"),
      { wrapper: wrapper() },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toHaveLength(2);
    expect(
      result.current.data.every((t) => t.deviceId === "PCS-1"),
    ).toBe(true);

    const [, containerId, points, from, to] = vi.mocked(
      containersApi.timeSeries,
    ).mock.calls[0]!;
    expect(containerId).toBe("c-1");
    expect(points).toBe(200);
    expect(
      new Date(to as string).getTime() - new Date(from as string).getTime(),
    ).toBe(60 * 60 * 1000);
  });

  it("seçilen isim veriyi daha da daraltır", async () => {
    vi.mocked(containersApi.timeSeries).mockResolvedValue([
      point("PCS-1", "AC Active Power", -40),
      point("PCS-1", "DC Voltage", 800),
    ]);

    const { result } = renderHook(
      () => usePcsTelemetryProvider("f-1", "c-1", "PCS-1"),
      { wrapper: wrapper() },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    act(() => result.current.setSelectedName("DC Voltage"));

    expect(result.current.data).toHaveLength(1);
    expect(result.current.data[0].name).toBe("DC Voltage");
  });
});
