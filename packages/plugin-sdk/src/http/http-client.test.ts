import { describe, expect, it, vi } from "vitest";
import { HttpClient, HttpError, type FetchLike } from "./http-client";

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as Response;
}

describe("HttpClient", () => {
  it("getJson — baseUrl ile birlesik URL ve header'lar ile istek atar", async () => {
    const fetchFn = vi.fn<FetchLike>(async () => jsonResponse(200, { ok: true }));
    const client = new HttpClient(
      { baseUrl: "https://api.example.com", defaultHeaders: { "X-Test": "1" } },
      fetchFn,
    );

    const result = await client.getJson<{ ok: boolean }>("/v1/data", {
      Authorization: "Bearer t",
    });

    expect(result).toEqual({ ok: true });
    expect(fetchFn).toHaveBeenCalledOnce();
    const [url, init] = fetchFn.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.example.com/v1/data");
    expect(init.method).toBe("GET");
    expect((init.headers as Record<string, string>)["X-Test"]).toBe("1");
    expect((init.headers as Record<string, string>)["Authorization"]).toBe(
      "Bearer t",
    );
  });

  it("postJson — JSON govde ve Content-Type header'i ekler", async () => {
    const fetchFn = vi.fn<FetchLike>(async () => jsonResponse(200, { id: 7 }));
    const client = new HttpClient({}, fetchFn);

    const result = await client.postJson<{ id: number }>("/v1/items", {
      name: "a",
    });

    expect(result).toEqual({ id: 7 });
    const [, init] = fetchFn.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe("POST");
    expect(init.body).toBe(JSON.stringify({ name: "a" }));
    expect((init.headers as Record<string, string>)["Content-Type"]).toBe(
      "application/json",
    );
  });

  it("postForm — form-encoded govde uretir", async () => {
    const fetchFn = vi.fn<FetchLike>(async () => jsonResponse(200, "TGT-123"));
    const client = new HttpClient({}, fetchFn);

    const result = await client.postForm<string>("/cas/v1/tickets", {
      username: "u",
      password: "p",
    });

    expect(result).toBe("TGT-123");
    const [, init] = fetchFn.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>)["Content-Type"]).toBe(
      "application/x-www-form-urlencoded",
    );
    expect(init.body).toBe("username=u&password=p");
  });

  it("5xx hatasinda yeniden dener, basarili denemeyi dondurur", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(500, { error: "ilk" }))
      .mockResolvedValueOnce(jsonResponse(200, { value: 42 }));
    const client = new HttpClient({ retryDelayMs: 1 }, fetchFn);

    const result = await client.getJson<{ value: number }>("/v1/x");

    expect(result).toEqual({ value: 42 });
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it("4xx hatasinda yeniden denemez, HttpError firlatir", async () => {
    const fetchFn = vi.fn<FetchLike>(async () => jsonResponse(401, { error: "unauth" }));
    const client = new HttpClient({}, fetchFn);

    await expect(client.getJson("/v1/secure")).rejects.toMatchObject({
      name: "HttpError",
      status: 401,
    });
    expect(fetchFn).toHaveBeenCalledOnce();
  });

  it("ag hatasinda maxRetries kadar yeniden dener", async () => {
    const fetchFn = vi.fn<FetchLike>(async () => {
      throw new Error("network down");
    });
    const client = new HttpClient({ maxRetries: 2, retryDelayMs: 1 }, fetchFn);

    await expect(client.getJson("/v1/x")).rejects.toThrow(/network down/);
    expect(fetchFn).toHaveBeenCalledTimes(3);
  });

  it("HttpError govdeyi ve durumu tasir", async () => {
    const fetchFn = vi.fn<FetchLike>(async () => jsonResponse(400, { msg: "kotu istek" }));
    const client = new HttpClient({}, fetchFn);

    try {
      await client.getJson("/v1/x");
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(HttpError);
      const httpError = error as HttpError;
      expect(httpError.status).toBe(400);
      expect(httpError.body).toContain("kotu istek");
    }
  });
});
