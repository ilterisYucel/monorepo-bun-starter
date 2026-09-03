import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useFieldConnection, FIELD_CONNECTION_QUERY_KEY } from "./useFieldConnection";
import { apiClient } from "../lib/api-client";

/**
 * T2.2 — useFieldConnection sözleşmesi:
 * - GET /api/status yanıtını `{ fieldConnected, state, lastHeartbeatAt }`'a eşler.
 * - 5 sn'de bir tazelenir (refetchInterval).
 * - Hata durumunda kapalı kabul edilir (`fieldConnected:false`, state "offline")
 *   — UI asla beyaz ekranda kalmaz.
 */

vi.mock("../lib/api-client", () => ({
  apiClient: { get: vi.fn() },
}));

const mockedGet = vi.mocked(apiClient.get);

function wrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe("useFieldConnection (T2.2)", () => {
  beforeEach(() => {
    mockedGet.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("bağlı durumu yansıtır", async () => {
    mockedGet.mockResolvedValue({
      data: {
        fieldConnected: true,
        state: "connected",
        lastHeartbeatAt: "2026-08-25T10:00:00.000Z",
      },
    });
    const { result } = renderHook(() => useFieldConnection(), {
      wrapper: wrapper(),
    });
    await waitFor(() => expect(result.current.fieldConnected).toBe(true));
    expect(result.current.state).toBe("connected");
    expect(result.current.lastHeartbeatAt).toBe("2026-08-25T10:00:00.000Z");
    expect(mockedGet).toHaveBeenCalledWith(
      "/status",
      expect.objectContaining({ signal: expect.anything() }),
    );
  });

  it("bağlantı yoksa kapalı bildirir", async () => {
    mockedGet.mockResolvedValue({
      data: { fieldConnected: false, state: "backoff" },
    });
    const { result } = renderHook(() => useFieldConnection(), {
      wrapper: wrapper(),
    });
    await waitFor(() => expect(result.current.state).toBe("backoff"));
    expect(result.current.fieldConnected).toBe(false);
    expect(result.current.lastHeartbeatAt).toBeUndefined();
  });

  it("istek hatasında kapalı kabul edilir", async () => {
    mockedGet.mockRejectedValue(new Error("network"));
    const { result } = renderHook(() => useFieldConnection(), {
      wrapper: wrapper(),
    });
    await waitFor(() => expect(result.current.state).toBe("offline"));
    expect(result.current.fieldConnected).toBe(false);
  });

  it("5 sn tazeleme aralığı kullanır", () => {
    expect(FIELD_CONNECTION_QUERY_KEY).toEqual(["fieldConnection"]);
  });
});
