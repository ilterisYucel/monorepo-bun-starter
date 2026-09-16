import { describe, it, expect, vi, afterEach } from "vitest";
import { containersApi } from "./containersApi";

const postMock = vi.fn();
vi.mock("../../../lib/api-client", () => ({
  apiClient: {
    get: vi.fn(),
    post: (...args: unknown[]) => postMock(...args),
    delete: vi.fn(),
  },
}));

/**
 * containersApi — tünel device uçları sözleşmesi (2026-09-02):
 * Field, konteynerin /api/unified/* uçlarına MEVCUT HTTP tünelinden erişir
 * (session-routes `/containers/:cid/ui/*` wildcard proxy — Path-scoped
 * `container_session` cookie'si tarayıcı tarafından otomatik taşınır).
 * Oturum AÇMAZ bu metodlar açmaz — hook katmanı openSession'ı önceden
 * çalıştırır (tek giriş noktası; her çağrıda audit log basılmaz).
 */

afterEach(() => {
  vi.unstubAllGlobals();
  postMock.mockReset();
});

describe("containersApi.executeCommands (WS4 D5)", () => {
  it("komut proxy rotasını doğru gövdeyle çağırır", async () => {
    postMock.mockResolvedValue({
      data: {
        results: [{ deviceId: "BSC-1", command: "stop", success: true }],
      },
    });

    const result = await containersApi.executeCommands(
      "f-1",
      "c-1",
      [{ deviceId: "BSC-1", command: "stop" }],
      { mode: "sequential" },
    );

    expect(postMock).toHaveBeenCalledWith(
      "/fields/f-1/containers/c-1/commands",
      {
        commands: [{ deviceId: "BSC-1", command: "stop", params: {} }],
        mode: "sequential",
        onFailure: "stop",
      },
    );
    expect(result.results[0]).toMatchObject({ success: true });
  });

  it("varsayılan mod parallel + onFailure stop", async () => {
    postMock.mockResolvedValue({ data: { results: [] } });
    await containersApi.executeCommands("f-1", "c-1", [
      { deviceId: "BSC-1", command: "stop", params: { x: 1 } },
    ]);
    const body = postMock.mock.calls[0]![1] as {
      mode: string;
      onFailure: string;
    };
    expect(body.mode).toBe("parallel");
    expect(body.onFailure).toBe("stop");
  });
});

describe("containersApi.listDevices (2026-09-02)", () => {
  it("tünel yolundan cihaz listesini döndürür", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        devices: [
          { id: "BSC-1", name: "BSC 1", type: "bsc", status: "online" },
          { id: "PCS-1", name: "PCS 1", type: "pcs", status: "online" },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const devices = await containersApi.listDevices("f-1", "c-1");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "/containers/c-1/ui/api/unified/devices",
    );
    expect(devices).toHaveLength(2);
    expect(devices[0].id).toBe("BSC-1");
  });

  it("hata durumunda throw eder (fallback tetiklenir)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 500 }),
    );
    await expect(containersApi.listDevices("f-1", "c-1")).rejects.toThrow();
  });
});

describe("containersApi.deviceConfig (2026-09-02)", () => {
  it("telemetry-config yanıtını döndürür", async () => {
    const config = {
      deviceId: "BSC-1",
      name: "BSC 1",
      manufacturer: "X",
      model: "Y",
      protocol: "MODBUS",
      telemetry: [],
      commands: [],
    };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => config,
      }),
    );

    const result = await containersApi.deviceConfig("f-1", "c-1", "BSC-1");

    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      "/containers/c-1/ui/api/unified/devices/BSC-1/telemetry-config",
    );
    expect(result).toEqual(config);
  });

  it("404 → null (config yok)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 404 }),
    );
    expect(await containersApi.deviceConfig("f-1", "c-1", "yok")).toBeNull();
  });

  it("404 dışı hata → throw", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 500 }),
    );
    await expect(
      containersApi.deviceConfig("f-1", "c-1", "BSC-1"),
    ).rejects.toThrow();
  });
});
