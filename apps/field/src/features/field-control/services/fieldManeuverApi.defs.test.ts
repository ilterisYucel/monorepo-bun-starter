import { describe, it, expect, vi, beforeEach } from "vitest";
import { fieldManeuverApi } from "./fieldManeuverApi";
import { apiClient } from "../../../lib/api-client";
import type { OperationRecord } from "@gd-monorepo/shared-types";

/**
 * fieldManeuverApi tanım yönetimi sözleşmesi (Faz C4 §11.2):
 * - createOperation/updateOperation/deleteOperation: POST/PUT/DELETE
 *   /operations — admin kanalı (Bearer).
 * - listRuns: GET /operations/runs → OperationRunRecord[].
 */

vi.mock("../../../lib/api-client", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

const definition: OperationRecord = {
  name: "admin_arbitraj",
  label: "Arbitraj",
  mode: "sequential",
  steps: [
    { system: "container-1", maneuver: "bsc_prepare" },
    { maneuver: "pcs_charge", params: { powerKw: 200 } },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("fieldManeuverApi — tanım yönetimi (C4)", () => {
  it("createOperation: POST /operations + tanım gövdesi", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { name: "admin_arbitraj" } });
    const result = await fieldManeuverApi.createOperation(definition);
    expect(apiClient.post).toHaveBeenCalledWith("/operations", definition);
    expect(result.name).toBe("admin_arbitraj");
  });

  it("updateOperation: PUT /operations/:name", async () => {
    vi.mocked(apiClient.put).mockResolvedValue({ data: { name: "x" } });
    await fieldManeuverApi.updateOperation("x", definition);
    expect(apiClient.put).toHaveBeenCalledWith("/operations/x", definition);
  });

  it("deleteOperation: DELETE /operations/:name (yumuşak silme)", async () => {
    vi.mocked(apiClient.delete).mockResolvedValue({ data: { name: "x" } });
    await fieldManeuverApi.deleteOperation("x");
    expect(apiClient.delete).toHaveBeenCalledWith("/operations/x");
  });

  it("listRuns: GET /operations/runs + boş → []", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: {} });
    expect(await fieldManeuverApi.listRuns()).toEqual([]);
    expect(apiClient.get).toHaveBeenCalledWith("/operations/runs", {
      signal: undefined,
    });
  });
});
