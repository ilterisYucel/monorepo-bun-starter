import { describe, it, expect, vi, beforeEach } from "vitest";
import { controlApi } from "./controlApi";
import { apiClient } from "../../../lib/api-client";
import { MANEUVER_CONTROLS } from "../maneuvers";
import type { ManeuverTransform } from "../maneuvers";

/**
 * controlApi + manevra transform sözleşmesi (2026-08-30 — T2):
 * - executeCommand/executeMulti: payload şekli (params default {}) + yanıt
 *   passthrough; API hatası çağırana fırlar.
 * - MANEUVER_CONTROLS.fl_bsc_power.transform: mode 0 → charge, 1 → discharge;
 *   values her adıma yayılır (güç bölme değil — tam değer taşınır).
 */

vi.mock("../../../lib/api-client", () => ({
  apiClient: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("controlApi (T2)", () => {
  it("executeCommand doğru payload gönderir ve yanıtı döner", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { deviceId: "BSC-1", command: "charge", success: true },
    });
    const result = await controlApi.executeCommand("BSC-1", "charge");
    expect(apiClient.post).toHaveBeenCalledWith("/commands/execute", {
      deviceId: "BSC-1",
      command: "charge",
      params: {},
    });
    expect(result.success).toBe(true);
  });

  it("executeCommand params'ı gönderir", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { deviceId: "BSC-1", command: "charge", success: true },
    });
    await controlApi.executeCommand("BSC-1", "charge", { powerKw: 50 });
    expect(apiClient.post).toHaveBeenCalledWith("/commands/execute", {
      deviceId: "BSC-1",
      command: "charge",
      params: { powerKw: 50 },
    });
  });

  it("executeMulti varsayılanlar: parallel + stop", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { results: [{ deviceId: "BSC-1", command: "stop", success: true }] },
    });
    const result = await controlApi.executeMulti([
      { deviceId: "BSC-1", command: "stop" },
    ]);
    expect(apiClient.post).toHaveBeenCalledWith("/commands/execute-multi", {
      commands: [{ deviceId: "BSC-1", command: "stop", params: {} }],
      mode: "parallel",
      onFailure: "stop",
    });
    expect(result.results).toHaveLength(1);
  });

  it("API hatası çağırana fırlar (yutulmaz)", async () => {
    vi.mocked(apiClient.post).mockRejectedValue(new Error("403"));
    await expect(controlApi.executeCommand("BSC-1", "charge")).rejects.toThrow(
      "403",
    );
  });
});

describe("MANEUVER_CONTROLS transform (T2)", () => {
  const transform = MANEUVER_CONTROLS.fl_bsc_power?.transform as
    | ManeuverTransform
    | undefined;

  it("fl_bsc_power transform tanımlıdır", () => {
    expect(transform).toBeDefined();
  });

  it("mode 0 → charge; mode 1 → discharge; değerler her adıma yayılır", () => {
    const steps = [
      { deviceId: "BSC-1" },
      { deviceId: "BSC-2" },
      { deviceId: "BSC-3" },
    ];
    const chargeParams = transform!({ mode: 0, powerKw: 60 }, steps);
    expect(chargeParams).toHaveLength(3);
    for (const params of chargeParams) {
      expect(params.command).toBe("charge");
      expect(params.powerKw).toBe(60);
    }

    const dischargeParams = transform!({ mode: 1, powerKw: 80 }, steps);
    for (const params of dischargeParams) {
      expect(params.command).toBe("discharge");
      expect(params.powerKw).toBe(80);
    }
  });

  it("boş adım listesi → boş parametre listesi", () => {
    expect(transform!({ mode: 0, powerKw: 10 }, [])).toEqual([]);
  });
});
