import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const useDemoFieldData = vi.fn();
vi.mock("../features/demo-data/useDemoFieldData", () => ({
  useDemoFieldData: () => useDemoFieldData(),
}));
vi.mock("../features/demo-data/useDemoFieldTelemetry", () => ({
  useDemoFieldTelemetry: () => ({ data: [], isLoading: false, isError: false, error: null }),
}));

import { DemoFieldPage } from "./DemoFieldPage";

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <DemoFieldPage />
    </QueryClientProvider>,
  );
}

describe("DemoFieldPage — boş/hata durumları (FR-1.3 / AK-1.3)", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_FIELD_ID", "f-1");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetAllMocks();
  });

  it("hata yanıtında hata mesajı gösterir", () => {
    useDemoFieldData.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error("boom"),
    });
    renderPage();
    expect(screen.getByText(/Saha verisi alınamadı/)).toBeTruthy();
  });

  it("boş listede saha yerleşimini boş üniteyle render eder", () => {
    useDemoFieldData.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      error: null,
    });
    renderPage();
    expect(screen.getByText("Saha yerleşimi")).toBeTruthy();
  });
});
