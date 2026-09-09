import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fieldsApi } from "../services/fieldsApi";
import { useFieldList, useCreateField } from "./useAdminFields";
import type { AdminField } from "../types";

vi.mock("../services/fieldsApi", () => ({
  fieldsApi: {
    list: vi.fn(),
    byId: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
}));

const row: AdminField = {
  id: "f-1",
  name: "İstanbul-1",
  location: { lat: 41, lng: 28.9 },
  api_url: null,
  status: "online",
  container_count: 4,
  online_containers: 4,
  total_power_mw: 2.4,
  avg_soc: 62,
  active_alarms: 0,
  last_seen_at: null,
  metadata: {},
  created_at: "",
  updated_at: "",
};

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
);

describe("useAdminFields (Faz 1 veri katmanı)", () => {
  beforeEach(() => {
    vi.mocked(fieldsApi.list).mockResolvedValue({ data: [row] } as never);
    vi.mocked(fieldsApi.create).mockResolvedValue(row as never);
  });

  it("useFieldList saha listesini döner", async () => {
    const { result } = renderHook(() => useFieldList(), { wrapper });
    await waitFor(() => expect(result.current.data).toHaveLength(1));
    expect(result.current.data?.[0].name).toBe("İstanbul-1");
  });

  it("useCreateField kayıt sonrası cache'i geçersiz kılar", async () => {
    const { result } = renderHook(() => useCreateField(), { wrapper });
    const created = await result.current.mutateAsync({
      name: "Ankara-1",
    });
    expect(created.id).toBe("f-1");
    expect(fieldsApi.create).toHaveBeenCalledWith({ name: "Ankara-1" });
  });
});
