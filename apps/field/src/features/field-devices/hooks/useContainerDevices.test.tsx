import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import type { TelemetryData } from "@gd-monorepo/shared-types";
import { useContainerDevices } from "./useContainerDevices";
import { containersApi } from "../../containers/services/containersApi";
import type { FieldContainer } from "../../containers/services/containersApi";
import type { DeviceInfo } from "../types/device";

/**
 * useContainerDevices sözleşmesi (2026-09-02 — Devices sayfası):
 * - Önce openSession (tek giriş noktası); başarılıysa konteynerin cihaz
 *   listesi MEVCUT tünelden çekilir (listDevices) — kaynak "tunnel".
 * - Oturum başarısızsa (konteyner offline / rol reddi) snapshot'tan
 *   türetilmiş listeye düşülür (kademeli bozulma) — kaynak "snapshot".
 * - latestTelemetry: seçili konteynerin snapshot'ı (modal canlı değerleri).
 */

vi.mock("../../containers/services/containersApi", () => ({
  containersApi: {
    list: vi.fn(),
    timeSeries: vi.fn(),
    openSession: vi.fn(),
    endSession: vi.fn(),
    register: vi.fn(),
    listDevices: vi.fn(),
    deviceConfig: vi.fn(),
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

const point = (deviceId: string, name: string, value: unknown): TelemetryData => ({
  deviceId,
  name,
  value,
  description: "",
  unit: "",
  timestamp: "2026-09-02T12:00:00.000Z",
});

const container = (id: string, telemetry: TelemetryData[]): FieldContainer => ({
  containerId: id,
  layout: { x: 0, y: 0, z: 0 },
  connectionStatus: "connected",
  latestTelemetry: telemetry,
});

const tunnelDevice = (id: string, name: string): DeviceInfo => ({
  id,
  name,
  protocol: "MODBUS",
  type: "bsc",
  status: "online",
  manufacturer: "X",
  model: "Y",
  rack_count: null,
  poll_interval_ms: null,
  connection: null,
  last_seen: null,
  created_at: "",
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useContainerDevices (2026-09-02)", () => {
  it("oturum açılır ve cihaz listesi tünelden gelir (source=tunnel)", async () => {
    vi.mocked(containersApi.list).mockResolvedValue([
      container("c-1", [point("BSC-1", "BSC SOC", 50)]),
    ]);
    vi.mocked(containersApi.openSession).mockResolvedValue({ ok: true, status: 200 });
    vi.mocked(containersApi.listDevices).mockResolvedValue([
      tunnelDevice("BSC-1", "BSC 1"),
      tunnelDevice("PCS-1", "PCS 1"),
    ]);

    const { result } = renderHook(
      () => useContainerDevices("f-1", "c-1"),
      { wrapper: wrapper() },
    );

    await waitFor(() => expect(result.current.source).toBe("tunnel"));
    expect(result.current.devices.map((d) => d.id)).toEqual(["BSC-1", "PCS-1"]);
    expect(containersApi.openSession).toHaveBeenCalledWith("f-1", "c-1");
    expect(result.current.latestTelemetry).toHaveLength(1);
  });

  it("oturum başarısızsa snapshot fallback'i (source=snapshot)", async () => {
    vi.mocked(containersApi.list).mockResolvedValue([
      container("c-1", [
        point("BSC-1", "BSC SOC", 50),
        point("PCS-1", "AC Active Power", -20),
      ]),
    ]);
    vi.mocked(containersApi.openSession).mockResolvedValue({ ok: false, status: 403 });

    const { result } = renderHook(
      () => useContainerDevices("f-1", "c-1"),
      { wrapper: wrapper() },
    );

    await waitFor(() =>
      expect(result.current.devices.map((d) => d.id)).toEqual(["BSC-1", "PCS-1"]),
    );
    expect(result.current.source).toBe("snapshot");
    expect(containersApi.listDevices).not.toHaveBeenCalled();
  });

  it("tünel listesi hata verirse snapshot fallback'i", async () => {
    vi.mocked(containersApi.list).mockResolvedValue([
      container("c-1", [point("BSC-1", "BSC SOC", 50)]),
    ]);
    vi.mocked(containersApi.openSession).mockResolvedValue({ ok: true, status: 200 });
    vi.mocked(containersApi.listDevices).mockRejectedValue(new Error("x"));

    const { result } = renderHook(
      () => useContainerDevices("f-1", "c-1"),
      { wrapper: wrapper() },
    );

    await waitFor(() =>
      expect(result.current.devices.map((d) => d.id)).toEqual(["BSC-1"]),
    );
    expect(result.current.source).toBe("snapshot");
  });

  it("seçili konteyner snapshot'ta yoksa boş liste", async () => {
    vi.mocked(containersApi.list).mockResolvedValue([
      container("c-2", [point("BSC-2", "BSC SOC", 50)]),
    ]);
    vi.mocked(containersApi.openSession).mockResolvedValue({ ok: false, status: 403 });

    const { result } = renderHook(
      () => useContainerDevices("f-1", "c-1"),
      { wrapper: wrapper() },
    );

    await waitFor(() => expect(result.current.source).toBe("snapshot"));
    expect(result.current.devices).toEqual([]);
  });
});
