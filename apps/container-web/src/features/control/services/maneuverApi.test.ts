import { describe, it, expect, vi, beforeEach } from "vitest";
import { maneuverApi } from "./maneuverApi";
import { apiClient } from "../../../lib/api-client";

/**
 * maneuverApi sözleşmesi (Faz D2):
 * - list: GET /maneuvers → ManeuverRecord[] (yanıt {maneuvers}).
 * - execute: POST /maneuvers/:name/execute — gövde {params} (varsayılan {}),
 *   deviceIds verilirse grup kısıtı taşınır; yanıt OperationRunResult.
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

describe("maneuverApi (Faz D2)", () => {
  it("list: GET /maneuvers + kayıt listesi döner", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: {
        maneuvers: [
          { name: "fl01_start", label: "FL-01", mode: "parallel", steps: [] },
        ],
      },
    });
    const result = await maneuverApi.list();
    expect(apiClient.get).toHaveBeenCalledWith("/maneuvers", { signal: undefined });
    expect(result).toHaveLength(1);
    expect(result[0]!.name).toBe("fl01_start");
  });

  it("list: boş katalog → [] (kademeli)", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: {} });
    expect(await maneuverApi.list()).toEqual([]);
  });

  it("execute: POST gövdesi {params:{}} varsayılan", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { runId: "r", kind: "maneuver", name: "x", status: "completed", outcomes: [] },
    });
    const result = await maneuverApi.execute("fl01_start");
    expect(apiClient.post).toHaveBeenCalledWith("/maneuvers/fl01_start/execute", {
      params: {},
    });
    expect(result.status).toBe("completed");
  });

  it("execute: params + deviceIds (grup kısıtı) taşınır", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { status: "completed" } });
    await maneuverApi.execute("pcs_charge", {
      params: { powerKw: 200 },
      deviceIds: ["PCS-2"],
    });
    expect(apiClient.post).toHaveBeenCalledWith("/maneuvers/pcs_charge/execute", {
      params: { powerKw: 200 },
      deviceIds: ["PCS-2"],
    });
  });
});
