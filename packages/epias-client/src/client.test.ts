import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { HttpClient, type FetchLike } from "@gd-monorepo/plugin-sdk";
import { EpiasClient } from "./client";
import { EpiasTicketStore } from "./ticket-store";
import { toEpiasIso } from "./date";

const CAS_URL = "https://cas.test/cas/v1/tickets";
const BASE_URL = "https://seffaflik.test/electricity-service/v1";

function apiResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as Response;
}

function casResponse(ticket: string): Response {
  return {
    ok: true,
    status: 201,
    text: async () => ticket,
  } as Response;
}

interface CallRecord {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
}

describe("EpiasClient", () => {
  let dir: string;
  let fetchFn: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "epias-client-"));
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await rm(dir, { recursive: true, force: true });
  });

  function makeStore(): EpiasTicketStore {
    return new EpiasTicketStore({
      filePath: join(dir, "tickets.json"),
      casUrl: CAS_URL,
      ttlMs: 60_000,
      renewBeforeMs: 0,
      fetchFn,
    });
  }

  function makeClient(): EpiasClient {
    const config = {
      username: "kullanici@firma.com.tr",
      password: "parola",
      casUrl: CAS_URL,
      baseUrl: BASE_URL,
      ticketStore: makeStore(),
    };
    return new EpiasClient(config, new HttpClient({ baseUrl: BASE_URL }, fetchFn));
  }

  it("fetchJson — once CAS'ten TGT alir, istege TGT header'i ekler", async () => {
    const calls: CallRecord[] = [];
    fetchFn = vi.fn<FetchLike>(async (url: string, init?: RequestInit) => {
      calls.push({
        url,
        method: init?.method ?? "GET",
        headers: (init?.headers ?? {}) as Record<string, string>,
        body: init?.body as string | undefined,
      });
      if (url === CAS_URL) {
        return casResponse("TGT-abc");
      }
      return apiResponse(200, { items: [{ date: "2026-08-14T10:00:00+03:00", hour: "10", price: 1900.5 }] });
    });

    const client = makeClient();
    const rows = await client.ptf(
      new Date("2026-08-14T00:00:00Z"),
      new Date("2026-08-14T23:59:59Z"),
    );

    expect(rows).toEqual([
      { date: "2026-08-14T10:00:00+03:00", hour: "10", price: 1900.5 },
    ]);
    const apiCall = calls.find((c) => c.url.includes("/markets/dam/data/mcp"));
    expect(apiCall).toBeDefined();
    expect(apiCall?.headers["TGT"]).toBe("TGT-abc");
    expect(apiCall?.method).toBe("POST");
  });

  it("ptf — tarihler +03:00 formatina cevrilir", async () => {
    fetchFn = vi.fn<FetchLike>(async (url: string, init?: RequestInit) => {
      if (url === CAS_URL) {
        return casResponse("TGT-x");
      }
      return apiResponse(200, { items: [] });
    });

    const client = makeClient();
    await client.ptf(
      new Date("2026-08-14T21:30:00Z"),
      new Date("2026-08-15T21:00:00Z"),
    );

    const apiCall = fetchFn.mock.calls.find(([url]) =>
      String(url).includes("/mcp"),
    );
    const body = JSON.parse((apiCall?.[1] as RequestInit).body as string);
    expect(body.startDate).toBe("2026-08-15T00:30:00+03:00");
    expect(body.endDate).toBe("2026-08-16T00:00:00+03:00");
  });

  it("401 alinirsa bilet gecersiz kilinir ve istek bir kez tekrarlanir", async () => {
    let casCalls = 0;
    let apiCalls = 0;
    fetchFn = vi.fn<FetchLike>(async (url: string, init?: RequestInit) => {
      if (url === CAS_URL) {
        casCalls += 1;
        return casResponse(`TGT-${casCalls}`);
      }
      apiCalls += 1;
      if (apiCalls === 1) {
        return apiResponse(401, { error: "sure doldu" });
      }
      return apiResponse(200, { items: [] });
    });

    const client = makeClient();
    await client.fetchJson("/v1/markets/dam/data/mcp", {
      startDate: "2026-08-14T00:00:00+03:00",
      endDate: "2026-08-14T23:59:59+03:00",
    });

    expect(casCalls).toBe(2);
    expect(apiCalls).toBe(2);
  });

  it("ayni client, bilet gecerliyken tek TGT kullanir", async () => {
    let casCalls = 0;
    fetchFn = vi.fn<FetchLike>(async (url: string) => {
      if (url === CAS_URL) {
        casCalls += 1;
        return casResponse(`TGT-${casCalls}`);
      }
      return apiResponse(200, { items: [] });
    });

    const client = makeClient();
    await client.systemMarginalPrice(new Date(), new Date());
    await client.systemMarginalPrice(new Date(), new Date());

    expect(casCalls).toBe(1);
  });
});

describe("toEpiasIso", () => {
  it("UTC tarihi Turkiye saati +03:00 olarak bicimler", () => {
    expect(toEpiasIso(new Date("2026-08-14T10:00:00Z"))).toBe(
      "2026-08-14T13:00:00+03:00",
    );
  });

  it("kis aylarinda da sabit +03:00 kullanir", () => {
    expect(toEpiasIso(new Date("2026-01-01T00:00:00Z"))).toBe(
      "2026-01-01T03:00:00+03:00",
    );
  });
});
