import { describe, it, expect, vi, afterEach } from "vitest";
import { fieldControlApi } from "./fieldControlApi";

const postMock = vi.fn();
vi.mock("../../../lib/api-client", () => ({
  apiClient: {
    get: vi.fn(),
    post: (...args: unknown[]) => postMock(...args),
    delete: vi.fn(),
  },
}));

/**
 * fieldControlApi sözleşmesi (WS4 + REV01):
 * - POST /commands/execute-multi — komut başına params {} doldurulur.
 * - mode/onFailure birebir iletilir.
 * - Yanıt results dizisi aynen döner (per-step success/reason).
 */

afterEach(() => {
  postMock.mockReset();
});

describe("fieldControlApi.executeMulti", () => {
  it("komutları execute-multi kontratıyla gönderir", async () => {
    postMock.mockResolvedValue({
      data: {
        results: [
          { deviceId: "PCS-1", command: "charge", success: true },
          { deviceId: "PCS-1", command: "stop", success: false, reason: "Validation timeout" },
        ],
      },
    });

    const results = await fieldControlApi.executeMulti({
      commands: [
        { deviceId: "PCS-1", command: "charge", params: { powerKw: 50 } },
        { deviceId: "PCS-1", command: "stop" },
      ],
      mode: "parallel",
      onFailure: "stop",
    });

    expect(postMock).toHaveBeenCalledWith("/commands/execute-multi", {
      commands: [
        { deviceId: "PCS-1", command: "charge", params: { powerKw: 50 } },
        { deviceId: "PCS-1", command: "stop", params: {} },
      ],
      mode: "parallel",
      onFailure: "stop",
    });
    expect(results).toHaveLength(2);
    expect(results[1]).toMatchObject({ success: false, reason: "Validation timeout" });
  });

  it("mode/onFailure birebir iletilir", async () => {
    postMock.mockResolvedValue({ data: { results: [] } });
    await fieldControlApi.executeMulti({
      commands: [{ deviceId: "PCS-1", command: "stop" }],
      mode: "sequential",
      onFailure: "continue",
    });
    const body = postMock.mock.calls[0]![1] as {
      mode: string;
      onFailure: string;
    };
    expect(body.mode).toBe("sequential");
    expect(body.onFailure).toBe("continue");
  });
});
