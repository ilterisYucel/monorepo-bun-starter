import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { TranslationProvider, TR_DICT } from "@gd-monorepo/ui";
import { ManeuverPanel } from "./ManeuverPanel";
import { apiClient } from "../../../lib/api-client";
import type { ManeuverRecord } from "@gd-monorepo/shared-types";

/**
 * ManeuverPanel sözleşmesi (Faz D2):
 * - Katalog GET /api/maneuvers'ten yüklenir (UI TANIMLAMAZ).
 * - `ui.hidden` kayıtlar GÖSTERİLMEZ.
 * - Çalıştırma POST /api/maneuvers/:name/execute'ya devreder; yanıt
 *   OperationRunResult (rolled_back DAHİL başarı sayılır).
 */

vi.mock("../../../lib/api-client", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

function record(name: string, overrides: Partial<ManeuverRecord> = {}): ManeuverRecord {
  return {
    name,
    label: name.toUpperCase(),
    mode: "parallel",
    steps: [{ deviceId: "BSC-1", command: "stop" }],
    ...overrides,
  };
}

function renderPanel(): QueryClient {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <TranslationProvider dictionaries={{ tr: TR_DICT }} defaultLocale="tr">
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </TranslationProvider>
  );
  render(<ManeuverPanel />, { wrapper });
  return queryClient;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ManeuverPanel (Faz D2)", () => {
  it("kataloğu sunucudan yükler; gizli kayıtları GÖSTERMEZ", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: {
        maneuvers: [
          record("fl01_start"),
          record("fl03_emergency_stop"),
          record("bsc_prepare", { ui: { hidden: true } }),
        ],
      },
    });
    renderPanel();

    await waitFor(() =>
      expect(vi.mocked(apiClient.get)).toHaveBeenCalledWith(
        "/maneuvers",
        expect.anything(),
      ),
    );
    expect(await screen.findByText("FL01_START")).toBeDefined();
    expect(await screen.findByText("FL03_EMERGENCY_STOP")).toBeDefined();
    await waitFor(() =>
      expect(screen.queryByText("BSC_PREPARE")).toBeNull(),
    );
  });

  it("katalog hatası → hata durumu (çökme yok)", async () => {
    vi.mocked(apiClient.get).mockRejectedValue(new Error("503"));
    renderPanel();
    await waitFor(() =>
      expect(vi.mocked(apiClient.get)).toHaveBeenCalled(),
    );
    // APP sözlüğü testte yok — anahtar fallback olarak görünür (çökme yok kanıtı)
    expect(await screen.findByText(/maneuver.loadError|yüklenemedi/i)).toBeDefined();
  });
});
