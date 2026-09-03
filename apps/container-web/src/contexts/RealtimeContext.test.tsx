import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RealtimeProvider } from "./RealtimeContext";
import { useRealtimeStream } from "./RealtimeContext";
import { useDevicesStore } from "../stores/devicesStore";
import type { ITelemetryTransport, TelemetryObserver } from "@gd-monorepo/shared-types";

/**
 * RealtimeProvider sözleşmesi (2026-08-30 — T2):
 * - WS transport error'ı "credentials" içeriyorsa: refresh token varsa
 *   /auth/refresh denenir; başarıda auth-token güncellenir + reconnect
 *   çağrılır (24/7 reconnect döngüsü kırılmaz).
 * - Refresh token YOKSA veya refresh BAŞARISIZSA reconnect çağrılmaz.
 * - "credentials" içermeyen hata refresh'i TETİKLEMEZ.
 */

let mockTransport: ITelemetryTransport & { observers: Set<TelemetryObserver> };

vi.mock("./TransportContext", () => ({
  useTransport: () => mockTransport,
}));

function Harness({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={client}>
      <RealtimeProvider>{children}</RealtimeProvider>
    </QueryClientProvider>
  );
}

function Probe() {
  useRealtimeStream();
  return null;
}

beforeEach(() => {
  mockTransport = {
    observers: new Set<TelemetryObserver>(),
    connect: vi.fn(async () => {}),
    disconnect: vi.fn(async () => {}),
    connectionState: () => "connected",
    subscribe(observer: TelemetryObserver) {
      mockTransport.observers.add(observer);
      return () => {
        mockTransport.observers.delete(observer);
      };
    },
  } as ITelemetryTransport & { observers: Set<TelemetryObserver> };

  useDevicesStore.setState({
    devices: [
      { id: "BSC-1", type: "bsc" },
      { id: "CB-1", type: "cb" },
    ] as never,
  });
  localStorage.clear();
  localStorage.setItem("auth-token", "eski-token");
  localStorage.setItem("auth-refresh-token", "rt-1");
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

async function renderHarness() {
  render(
    <Harness>
      <Probe />
    </Harness>,
  );
  await waitFor(() => expect(mockTransport.connect).toHaveBeenCalled());
}

describe("RealtimeProvider token refresh (T2)", () => {
  it("credentials hatası → refresh başarılı → token güncellenir + reconnect", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ accessToken: "yeni-token" }), { status: 200 }),
    );
    await renderHarness();

    act(() => {
      for (const o of mockTransport.observers) {
        o.onError(new Error("WebSocket rejected: invalid credentials"));
      }
    });

    await waitFor(() =>
      expect(localStorage.getItem("auth-token")).toBe("yeni-token"),
    );
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/auth/refresh");
    expect(mockTransport.connect).toHaveBeenCalledTimes(2);
  });

  it("refresh token yoksa refresh ÇAĞRILMAZ", async () => {
    localStorage.removeItem("auth-refresh-token");
    const fetchMock = vi.spyOn(globalThis, "fetch");
    await renderHarness();

    act(() => {
      for (const o of mockTransport.observers) {
        o.onError(new Error("invalid credentials"));
      }
    });

    await new Promise((r) => setTimeout(r, 20));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(mockTransport.connect).toHaveBeenCalledTimes(1);
  });

  it("refresh başarısız → reconnect çağrılmaz, token değişmez", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("401"));
    await renderHarness();

    act(() => {
      for (const o of mockTransport.observers) {
        o.onError(new Error("invalid credentials"));
      }
    });

    await new Promise((r) => setTimeout(r, 20));
    expect(localStorage.getItem("auth-token")).toBe("eski-token");
    expect(mockTransport.connect).toHaveBeenCalledTimes(1);
  });

  it("credentials içermeyen hata refresh'i TETİKLEMEZ", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    await renderHarness();

    act(() => {
      for (const o of mockTransport.observers) {
        o.onError(new Error("Connection error"));
      }
    });

    await new Promise((r) => setTimeout(r, 20));
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
