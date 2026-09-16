import { describe, it, expect, vi } from "vitest";
import { HttpContainerCommandChannel } from "./container-command-channel";

/**
 * HttpContainerCommandChannel sözleşmesi (WS4 D4):
 * - URL: {baseUrl}/api/fields/{fieldId}/containers/{containerId}/commands
 * - Gövde: execute-multi kontratı (sequential + stop); x-gd-trace-id başlığı.
 * - 2xx + tüm sonuçlar success → ok.
 * - Sonuçlarda success=false → ok=false + ilk başarısızın reason'ı.
 * - HTTP hatası / network hatası → ok=false (throw YOK).
 */

const okFetch = vi.fn(async () => ({
  ok: true,
  status: 200,
  json: async () => ({ results: [{ success: true }] }),
}));

function channel(fetchFn: typeof fetch = okFetch as unknown as typeof fetch) {
  return new HttpContainerCommandChannel({
    baseUrl: "http://web-service:5001/",
    fieldId: "f-1",
    fetchFn,
  });
}

describe("HttpContainerCommandChannel", () => {
  it("URL + gövde + trace başlığı doğru", async () => {
    const fetchFn = vi.fn(okFetch);
    const result = await channel(fetchFn as unknown as typeof fetch).send({
      containerId: "c-1",
      deviceId: "BSC-1",
      command: "stop",
      traceId: "auto:r1",
    });

    expect(result.ok).toBe(true);
    expect(fetchFn).toHaveBeenCalledWith(
      "http://web-service:5001/api/fields/f-1/containers/c-1/commands",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "content-type": "application/json",
          "x-gd-trace-id": "auto:r1",
        }),
        body: JSON.stringify({
          commands: [{ deviceId: "BSC-1", command: "stop", params: {} }],
          mode: "sequential",
          onFailure: "stop",
        }),
      }),
    );
  });

  it("internalToken verilirse x-internal-token başlığı gider", async () => {
    const fetchFn = vi.fn(okFetch);
    const ch = new HttpContainerCommandChannel({
      baseUrl: "http://web-service:5001",
      fieldId: "f-1",
      internalToken: "secret",
      fetchFn: fetchFn as unknown as typeof fetch,
    });
    await ch.send({
      containerId: "c-1",
      deviceId: "BSC-1",
      command: "stop",
      traceId: "auto:r1",
    });
    const headers = (fetchFn.mock.calls[0]![1] as { headers: Record<string, string> }).headers;
    expect(headers["x-internal-token"]).toBe("secret");
  });

  it("sonuçlarda success=false → ok=false + reason", async () => {
    const fetchFn = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        results: [
          { deviceId: "BSC-1", command: "stop", success: false, reason: "Validation timeout" },
        ],
      }),
    }));
    const result = await channel(fetchFn as unknown as typeof fetch).send({
      containerId: "c-1",
      deviceId: "BSC-1",
      command: "stop",
      traceId: "auto:r1",
    });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("Validation timeout");
  });

  it("HTTP 503 → ok=false, throw YOK", async () => {
    const fetchFn = vi.fn(async () => ({
      ok: false,
      status: 503,
      json: async () => ({ error: "container_not_connected" }),
    }));
    const result = await channel(fetchFn as unknown as typeof fetch).send({
      containerId: "c-1",
      deviceId: "BSC-1",
      command: "stop",
      traceId: "auto:r1",
    });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("container_not_connected");
  });

  it("network hatası → ok=false + String(error)", async () => {
    const fetchFn = vi.fn(async () => {
      throw new Error("ECONNREFUSED");
    });
    const result = await channel(fetchFn as unknown as typeof fetch).send({
      containerId: "c-1",
      deviceId: "BSC-1",
      command: "stop",
      traceId: "auto:r1",
    });
    expect(result.ok).toBe(false);
    expect(result.reason).toContain("ECONNREFUSED");
  });

  it("baseUrl/fillId eksik → constructor reddeder", () => {
    expect(
      () =>
        new HttpContainerCommandChannel({
          baseUrl: "",
          fieldId: "f-1",
        }),
    ).toThrow();
  });
});
