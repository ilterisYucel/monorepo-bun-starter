import { describe, it, expect, vi, beforeEach } from "vitest";
import { fieldManeuverApi } from "./fieldManeuverApi";
import { apiClient } from "../../../lib/api-client";

/**
 * fieldManeuverApi sözleşmesi (Faz D2):
 * - listManeuvers/listOperations: GET /maneuvers + /operations.
 * - executeManeuver/executeOperation: POST /:name/execute — {params}
 *   varsayılan; deviceIds (grup) + timer taşınır; yanıt OperationRunResult.
 */

vi.mock("../../../lib/api-client", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("fieldManeuverApi (Faz D2)", () => {
  it("listManeuvers/listOperations: doğru uçlar + boş katalog []", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: {} });
    expect(await fieldManeuverApi.listManeuvers()).toEqual([]);
    expect(await fieldManeuverApi.listOperations()).toEqual([]);
    expect(vi.mocked(apiClient.get)).toHaveBeenCalledWith("/maneuvers", {
      signal: undefined,
    });
    expect(vi.mocked(apiClient.get)).toHaveBeenCalledWith("/operations", {
      signal: undefined,
    });
  });

  it("executeManeuver: gövde {params} varsayılan; deviceIds + timer taşınır", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { status: "completed" } });
    await fieldManeuverApi.executeManeuver("pcs_charge", {
      params: { powerKw: 200 },
      deviceIds: ["PCS-2"],
      timer: { durationSeconds: 60 },
    });
    expect(vi.mocked(apiClient.post)).toHaveBeenCalledWith(
      "/maneuvers/pcs_charge/execute",
      {
        params: { powerKw: 200 },
        deviceIds: ["PCS-2"],
        timer: { durationSeconds: 60 },
      },
    );
  });

  it("executeOperation: doğru uç + sonuç passthrough", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { runId: "r", kind: "operation", name: "field_charge", status: "rolled_back", outcomes: [] },
    });
    const result = await fieldManeuverApi.executeOperation("field_charge", {
      params: { powerKw: 200 },
    });
    expect(vi.mocked(apiClient.post)).toHaveBeenCalledWith(
      "/operations/field_charge/execute",
      { params: { powerKw: 200 } },
    );
    expect(result.status).toBe("rolled_back");
  });
});
