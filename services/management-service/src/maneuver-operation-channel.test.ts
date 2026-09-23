import { describe, it, expect, vi, beforeEach } from "vitest";
import { HttpManeuverOperationChannel } from "./maneuver-operation-channel";

/**
 * HttpManeuverOperationChannel sözleşmesi (KURAL-MOTORU-V2 §3.2):
 * - POST /api/maneuvers|operations/:name/execute + {params} gövdesi +
 *   x-gd-trace-id + x-internal-token başlıkları.
 * - 200 completed/rolled_back → ok; failed/rejected → ok:false + reason.
 * - 202 → ok + started (arka plan).
 * - 4xx/5xx/network/timeout → ok:false (throw YOK).
 */

function makeFetch(impl: (input: RequestInfo, init?: RequestInit) => Promise<Response>) {
  return vi.fn(impl as never);
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

beforeEach(() => {
  vi.useRealTimers();
});

describe("HttpManeuverOperationChannel", () => {
  it("POST yolu + gövde + başlıklar birebir", async () => {
    const fetchFn = makeFetch(async () => jsonResponse(200, { status: "completed" }));
    const channel = new HttpManeuverOperationChannel({
      baseUrl: "http://web:5001/",
      internalToken: "secret",
      fetchFn: fetchFn as unknown as typeof fetch,
    });
    const result = await channel.execute(
      "operation",
      "field_charge",
      { powerKw: 200 },
      "auto:r1",
    );
    expect(result).toEqual({ ok: true, traceId: "auto:r1" });
    const [url, init] = fetchFn.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://web:5001/api/operations/field_charge/execute");
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({
      "x-gd-trace-id": "auto:r1",
      "x-internal-token": "secret",
    });
    expect(JSON.parse(init.body as string)).toEqual({ params: { powerKw: 200 } });
  });

  it("maneuver türü doğru önek üretir", async () => {
    const fetchFn = makeFetch(async () => jsonResponse(200, { status: "completed" }));
    const channel = new HttpManeuverOperationChannel({
      baseUrl: "http://web:5001",
      fetchFn: fetchFn as unknown as typeof fetch,
    });
    await channel.execute("maneuver", "pcs_charge", undefined, "t");
    const [url] = fetchFn.mock.calls[0] as [string];
    expect(url).toBe("http://web:5001/api/maneuvers/pcs_charge/execute");
  });

  it("rolled_back → ok (kompanzasyon tamamlandı — terminal)", async () => {
    const fetchFn = makeFetch(async () => jsonResponse(200, { status: "rolled_back" }));
    const channel = new HttpManeuverOperationChannel({
      baseUrl: "http://web:5001",
      fetchFn: fetchFn as unknown as typeof fetch,
    });
    expect((await channel.execute("operation", "x", undefined, "t")).ok).toBe(true);
  });

  it("failed/rejected → ok:false + reason (409 operation_disabled — UC-4)", async () => {
    const rejected = makeFetch(async () =>
      jsonResponse(409, { error: "disabled" }),
    );
    const channel = new HttpManeuverOperationChannel({
      baseUrl: "http://web:5001",
      fetchFn: rejected as unknown as typeof fetch,
    });
    const result = await channel.execute("operation", "bakim", undefined, "t");
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("disabled");

    const failed = makeFetch(async () =>
      jsonResponse(422, { status: "failed", reason: "hata" }),
    );
    const channel2 = new HttpManeuverOperationChannel({
      baseUrl: "http://web:5001",
      fetchFn: failed as unknown as typeof fetch,
    });
    expect((await channel2.execute("operation", "x", undefined, "t")).reason).toBe("hata");
  });

  it("202 → ok + started (arka planda sürüyor)", async () => {
    const fetchFn = makeFetch(async () => jsonResponse(202, {}));
    const channel = new HttpManeuverOperationChannel({
      baseUrl: "http://web:5001",
      fetchFn: fetchFn as unknown as typeof fetch,
    });
    const result = await channel.execute("operation", "field_charge", undefined, "t");
    expect(result).toEqual({ ok: true, started: true, traceId: "t" });
  });

  it("network hatası / 503 → ok:false (throw YOK)", async () => {
    const network = makeFetch(async () => {
      throw new Error("ECONNREFUSED");
    });
    const channel = new HttpManeuverOperationChannel({
      baseUrl: "http://web:5001",
      fetchFn: network as unknown as typeof fetch,
    });
    expect((await channel.execute("operation", "x", undefined, "t")).ok).toBe(false);

    const serverErr = makeFetch(async () => jsonResponse(503, { error: "yok" }));
    const channel2 = new HttpManeuverOperationChannel({
      baseUrl: "http://web:5001",
      fetchFn: serverErr as unknown as typeof fetch,
    });
    expect((await channel2.execute("operation", "x", undefined, "t")).reason).toBe("yok");
  });

  it("timeout → ok:false + reason timeout (AbortController)", async () => {
    vi.useFakeTimers();
    try {
      const fetchFn = makeFetch(
        (_input: RequestInfo, init?: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener("abort", () =>
              reject(new DOMException("aborted", "AbortError")),
            );
          }),
      );
      const channel = new HttpManeuverOperationChannel({
        baseUrl: "http://web:5001",
        timeoutMs: 1000,
        fetchFn: fetchFn as unknown as typeof fetch,
      });
      const pending = channel.execute("operation", "x", undefined, "t");
      vi.advanceTimersByTime(1000);
      const result = await pending;
      expect(result.ok).toBe(false);
      expect(result.reason).toBe("timeout");
    } finally {
      vi.useRealTimers();
    }
  });
});
