import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { AdminOperationsPage } from "./AdminOperationsPage";
import { useAuthStore } from "../features/auth/stores/AuthStore";
import { fieldManeuverApi } from "../features/field-control/services/fieldManeuverApi";

/**
 * AdminOperationsPage sözleşmesi (C4 §11.3):
 * - Yalnız admin: isAdmin değilse içerik GÖSTERİLMEZ.
 * - Tanımlar + geçmiş sunucudan listelenir.
 * - Kaydet → POST /operations (OperationRecord şekli: mode/onFailure/steps/
 *   rollback; boş manevra adımları elenir).
 */

vi.mock("../features/field-control/services/fieldManeuverApi", () => ({
  fieldManeuverApi: {
    listManeuvers: vi.fn(),
    listOperations: vi.fn(),
    listRuns: vi.fn(),
    createOperation: vi.fn(),
    deleteOperation: vi.fn(),
  },
}));

vi.mock("../features/containers/hooks/useContainerData", () => ({
  useContainerData: () => ({
    containers: [
      { containerId: "container-1", connectionStatus: "connected" },
    ],
    isLoading: false,
    isError: false,
  }),
}));

const listManeuversMock = vi.mocked(fieldManeuverApi.listManeuvers);
const listOperationsMock = vi.mocked(fieldManeuverApi.listOperations);
const listRunsMock = vi.mocked(fieldManeuverApi.listRuns);
const createMock = vi.mocked(fieldManeuverApi.createOperation);
const deleteMock = vi.mocked(fieldManeuverApi.deleteOperation);

function renderPage(): QueryClient {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  render(<AdminOperationsPage />, { wrapper });
  return queryClient;
}

beforeEach(() => {
  vi.clearAllMocks();
  listManeuversMock.mockResolvedValue([
    {
      name: "bsc_prepare",
      label: "BSC Hazırlık",
      mode: "parallel",
      steps: [{ deviceId: "BSC-1", command: "start" }],
    },
    {
      name: "pcs_charge",
      label: "PCS Şarj",
      mode: "parallel",
      steps: [{ deviceTypes: ["pcs"], command: "charge" }],
    },
  ]);
  listOperationsMock.mockResolvedValue([
    {
      name: "field_charge",
      label: "Saha Şarj",
      mode: "sequential",
      steps: [{ system: "container-1", maneuver: "bsc_prepare" }],
    },
  ]);
  listRunsMock.mockResolvedValue([
    {
      id: "run-1",
      kind: "operation",
      name: "field_charge",
      trigger: "manual",
      status: "completed",
      steps: {},
      startedAt: "2026-09-22T10:00:00.000Z",
      finishedAt: null,
      createdBy: "admin",
      traceId: null,
    },
  ]);
  createMock.mockResolvedValue({ name: "x" });
  deleteMock.mockResolvedValue({ name: "x" });
});

describe("AdminOperationsPage (C4)", () => {
  it("admin değilse içerik GÖSTERİLMEZ", async () => {
    useAuthStore.setState({ isAdmin: false } as never);
    renderPage();
    expect(screen.getByText(/Yalnızca admin/i)).toBeTruthy();
  });

  it("tanımlar + geçmiş listelenir", async () => {
    useAuthStore.setState({ isAdmin: true } as never);
    renderPage();
    expect(await screen.findByText(/Saha Şarj/)).toBeTruthy();
    expect(await screen.findByText(/completed/)).toBeTruthy();
    expect(screen.getByText(/manual/)).toBeTruthy();
  });

  it("Kaydet → createOperation (boş manevra adımları elenir)", async () => {
    useAuthStore.setState({ isAdmin: true } as never);
    renderPage();
    await screen.findByText(/Saha Şarj/);

    fireEvent.change(screen.getByLabelText(/Ad:/), {
      target: { value: "admin_op" },
    });
    fireEvent.click(screen.getByText("Kaydet"));

    await waitFor(() =>
      expect(createMock).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "admin_op",
          mode: "sequential",
          onFailure: "stop",
          steps: [], // tek adım manevrasız — elendi
        }),
      ),
    );
  });

  it("Devre Dışı Bırak → deleteOperation (yumuşak silme)", async () => {
    useAuthStore.setState({ isAdmin: true } as never);
    renderPage();
    await screen.findByText(/Saha Şarj/);
    fireEvent.click(screen.getByText("Devre Dışı Bırak"));
    await waitFor(() => expect(deleteMock).toHaveBeenCalledWith("field_charge"));
  });
});
