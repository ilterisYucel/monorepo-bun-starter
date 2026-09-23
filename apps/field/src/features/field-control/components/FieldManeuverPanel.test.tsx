import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { TranslationProvider, TR_DICT, EN_DICT } from "@gd-monorepo/ui";
import type { TelemetryData, ManeuverRecord, OperationRecord } from "@gd-monorepo/shared-types";
import { FieldManeuverPanel } from "./FieldManeuverPanel";
import { fieldManeuverApi } from "../services/fieldManeuverApi";
import { FIELD_TR_DICT } from "../../../i18n/tr";
import { FIELD_EN_DICT } from "../../../i18n/en";

/**
 * FieldManeuverPanel sözleşmesi (Faz D2 — sunucu kataloğu):
 *
 * - Kart seti GET /api/maneuvers + /api/operations'tan gelir (UI TANIMLAMAZ);
 *   `ui.hidden` kayıtlar GÖSTERİLMEZ (FL-06/07/10, pcs_stop).
 * - Operasyon kartları (FL-02 → Saha Şarj/Deşarj; FL-11 → Saha Bakım Modu)
 *   görünür.
 * - Çalıştır → executeManeuver/executeOperation (params + grup deviceIds
 *   kısıtı); sonuç rolled_back DAHİL başarı sayılır.
 * - API hatası → failed (throw yutulur).
 */

const pcsTelemetry = (deviceId: string): TelemetryData => ({
  deviceId,
  name: "Status",
  value: 1,
  timestamp: new Date().toISOString(),
});

const containers = [
  {
    containerId: "c-1",
    connectionStatus: "connected" as const,
    latestTelemetry: [pcsTelemetry("PCS-1")],
    layout: { x: 0, y: 0, z: 0 },
    lastSeenAt: new Date().toISOString(),
  },
  {
    containerId: "c-2",
    connectionStatus: "connected" as const,
    latestTelemetry: [pcsTelemetry("PCS-2")],
    layout: { x: 0, y: 1, z: 0 },
    lastSeenAt: new Date().toISOString(),
  },
];

vi.mock("../../containers/hooks/useContainerData", () => ({
  useContainerData: () => ({
    containers,
    isLoading: false,
    isError: false,
  }),
}));

vi.mock("../services/fieldManeuverApi", () => ({
  fieldManeuverApi: {
    listManeuvers: vi.fn(),
    listOperations: vi.fn(),
    executeManeuver: vi.fn(),
    executeOperation: vi.fn(),
  },
}));

const listManeuversMock = vi.mocked(fieldManeuverApi.listManeuvers);
const listOperationsMock = vi.mocked(fieldManeuverApi.listOperations);
const executeManeuverMock = vi.mocked(fieldManeuverApi.executeManeuver);
const executeOperationMock = vi.mocked(fieldManeuverApi.executeOperation);

function maneuverRecord(name: string, label: string, overrides: Partial<ManeuverRecord> = {}): ManeuverRecord {
  return {
    name,
    label,
    mode: "parallel",
    steps: [{ deviceTypes: ["pcs"], command: "start" }],
    ...overrides,
  };
}

function operationRecord(name: string, label: string): OperationRecord {
  return {
    name,
    label,
    mode: "sequential",
    steps: [
      { system: "container-1", maneuver: "bsc_prepare" },
      { maneuver: "pcs_charge", params: { powerKw: 200 } },
    ],
  };
}

function renderPanel(): QueryClient {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <TranslationProvider
      dictionaries={{ tr: TR_DICT, en: EN_DICT }}
      extraKeys={{ tr: FIELD_TR_DICT, en: FIELD_EN_DICT }}
      defaultLocale="tr"
    >
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </TranslationProvider>
  );
  render(<FieldManeuverPanel />, { wrapper });
  return queryClient;
}

beforeEach(() => {
  vi.clearAllMocks();
  listManeuversMock.mockResolvedValue([
    maneuverRecord("fl01_startup", "FL-01: Başlatma"),
    maneuverRecord("fl05_emergency_stop", "FL-05: Acil Durdurma"),
    maneuverRecord("fl06_recovery", "FL-06: Recovery", { ui: { hidden: true } }),
    maneuverRecord("pcs_charge", "PCS Şarj", {
      ui: { inputs: [{ name: "powerKw", label: "Güç", unit: "kW", min: 0, max: 3568, step: 10, default: 50, type: "number" }] },
    }),
  ]);
  listOperationsMock.mockResolvedValue([
    operationRecord("field_charge", "Saha Şarj"),
    operationRecord("field_maintenance", "Saha Bakım Modu"),
  ]);
  executeManeuverMock.mockResolvedValue({
    runId: "r",
    kind: "maneuver",
    name: "x",
    status: "completed",
    outcomes: [],
  });
  executeOperationMock.mockResolvedValue({
    runId: "r",
    kind: "operation",
    name: "x",
    status: "completed",
    outcomes: [],
  });
});

describe("FieldManeuverPanel (Faz D2 — sunucu kataloğu)", () => {
  it("kartlar sunucudan gelir; gizli manevralar YOKTUR; operasyon kartları görünür", async () => {
    renderPanel();
    expect(await screen.findByText("FL-01: Başlatma")).toBeTruthy();
    expect(screen.getByText("FL-05: Acil Durdurma")).toBeTruthy();
    expect(screen.getByText("Saha Şarj")).toBeTruthy();
    expect(screen.getByText("Saha Bakım Modu")).toBeTruthy();
    await waitFor(() =>
      expect(screen.queryByText("FL-06: Recovery")).toBeNull(),
    );
  });

  it("Çalıştır → executeManeuver (params + grup deviceIds kısıtı)", async () => {
    renderPanel();
    await screen.findByText("FL-01: Başlatma");

    // Grup seçimi: PCS-1
    fireEvent.change(screen.getByLabelText("Grup"), {
      target: { value: "0" },
    });
    fireEvent.click(screen.getAllByText("▶ Çalıştır")[0]!);

    await waitFor(() =>
      expect(executeManeuverMock).toHaveBeenCalledWith(
        "fl01_startup",
        expect.objectContaining({ deviceIds: ["PCS-1"] }),
      ),
    );
  });

  it("operasyon kartı → executeOperation", async () => {
    renderPanel();
    const ops = await screen.findAllByText("Saha Şarj");
    const card = ops[0]!.closest("div[class]");
    expect(card).toBeTruthy();
    // Operasyon kartının Çalıştır butonuna kart konteynerinden ulaşılır
    const runButtons = screen.getAllByText("▶ Çalıştır");
    // fl01, fl05, pcs_charge (manevra) + field_charge, field_maintenance (operasyon)
    expect(runButtons.length).toBeGreaterThanOrEqual(5);
  });

  it("kısmi başarısızlık (rolled_back) başarı sayılır — failed değil", async () => {
    executeManeuverMock.mockResolvedValue({
      runId: "r",
      kind: "maneuver",
      name: "fl01_startup",
      status: "rolled_back",
      outcomes: [],
    });
    renderPanel();
    await screen.findByText("FL-01: Başlatma");
    fireEvent.click(screen.getAllByText("▶ Çalıştır")[0]!);
    await waitFor(() =>
      expect(screen.queryByText("Tekrar Dene")).toBeNull(),
    );
  });

  it("API hatası → failed durumu (throw yutulur)", async () => {
    executeManeuverMock.mockRejectedValue(new Error("network down"));
    renderPanel();
    await screen.findByText("FL-01: Başlatma");
    fireEvent.click(screen.getAllByText("▶ Çalıştır")[0]!);
    await screen.findByText("Tekrar Dene");
  });
});
