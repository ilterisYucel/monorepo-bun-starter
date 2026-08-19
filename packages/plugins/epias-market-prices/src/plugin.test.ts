import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { PluginContext } from "@gd-monorepo/plugin-sdk";
import type { FetchLike } from "@gd-monorepo/plugin-sdk";
import { EpiasTicketStore } from "@gd-monorepo/epias-client";
import { EpiasMarketPricesPlugin } from "./plugin";

const CAS_URL = "https://cas.test/cas/v1/tickets";

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

class MemoryStateStore {
  private readonly data = new Map<string, unknown>();

  async read(key: string): Promise<unknown> {
    return this.data.get(key);
  }

  async write(key: string, value: unknown): Promise<void> {
    this.data.set(key, value);
  }

  async remove(key: string): Promise<void> {
    this.data.delete(key);
  }
}

function makeContext(): PluginContext {
  return {
    logger: { info: () => {}, warn: () => {}, error: () => {} },
    config: {
      username: "kullanici@firma.com.tr",
      password: "parola",
      casUrl: CAS_URL,
      baseUrl: "https://seffaflik.test/electricity-service/v1",
      series: [
        { name: "PTF", path: "/v1/markets/dam/data/mcp", unit: "TRY/MWh", dateField: "date", valueField: "price" },
        { name: "SMF", path: "/v1/markets/bpm/data/system-marginal-price", unit: "TRY/MWh", dateField: "date", valueField: "systemMarginalPrice" },
      ],
    },
    pluginDir: "/plugins/epias-market-prices",
    state: new MemoryStateStore() as never,
  };
}

interface ApiCall {
  url: string;
  body?: string;
  tgt: string;
}

describe("EpiasMarketPricesPlugin", () => {
  let dir: string;
  let fetchFn: ReturnType<typeof vi.fn>;
  let apiCalls: ApiCall[];

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "epias-plugin-"));
    apiCalls = [];
    fetchFn = vi.fn<FetchLike>(async (url: string, init?: RequestInit) => {
      if (url === CAS_URL) {
        return casResponse("TGT-test-1");
      }
      apiCalls.push({
        url,
        body: init?.body as string | undefined,
        tgt: ((init?.headers ?? {}) as Record<string, string>)["TGT"] ?? "",
      });
      if (url.includes("/mcp")) {
        return apiResponse(200, {
          items: [{ date: "2026-08-14T10:00:00+03:00", hour: "10", price: 1900.5 }],
        });
      }
      return apiResponse(200, {
        items: [{ date: "2026-08-14T11:00:00+03:00", hour: "11", systemMarginalPrice: 1950.0 }],
      });
    });
    vi.stubGlobal("fetch", fetchFn);
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    await rm(dir, { recursive: true, force: true });
  });

  function makePlugin(): EpiasMarketPricesPlugin {
    return new EpiasMarketPricesPlugin(
      new EpiasTicketStore({
        filePath: join(dir, "tickets.json"),
        casUrl: CAS_URL,
        ttlMs: 60_000,
        renewBeforeMs: 0,
        fetchFn,
      }),
    );
  }

  it("manifest ve schedule dondurur", async () => {
    const plugin = makePlugin();
    await plugin.activate(makeContext());

    expect(plugin.manifest().name).toBe("epias-market-prices");
    expect(plugin.manifest().kind).toBe("integration");
    expect(plugin.schedule()).toEqual({ mode: "interval", everyMs: 3600000 });
  });

  it("fetch — satirlari MarketDataPoint'e cevirir, TGT header ekler ve cursor yazar", async () => {
    const plugin = makePlugin();
    const context = makeContext();
    await plugin.activate(context);

    const points = await plugin.fetch(context, {
      from: "2026-08-14T00:00:00Z",
      to: "2026-08-14T23:59:59Z",
    });

    expect(points).toHaveLength(2);
    expect(points[0]).toMatchObject({
      source: "epias",
      series: "PTF",
      value: 1900.5,
      unit: "TRY/MWh",
    });
    expect(points[1]?.series).toBe("SMF");
    expect(points[1]?.timestamp).toBe("2026-08-14T08:00:00.000Z");

    expect(apiCalls).toHaveLength(2);
    expect(apiCalls.every((c) => c.tgt === "TGT-test-1")).toBe(true);
    const mcpCall = apiCalls.find((c) => c.url.includes("/mcp"));
    const mcpBody = JSON.parse(mcpCall?.body ?? "{}");
    expect(mcpBody.startDate).toBe("2026-08-14T03:00:00+03:00");
    expect(mcpBody.endDate).toBe("2026-08-15T02:59:59+03:00");

    expect(await context.state.read("lastFetchTo")).toBe("2026-08-14T23:59:59Z");
  });

  it("fetch — pencere verilmezse cursor'dan devam eder", async () => {
    const plugin = makePlugin();
    const context = makeContext();
    await context.state.write("lastFetchTo", "2026-08-14T05:00:00.000Z");
    await plugin.activate(context);

    await plugin.fetch(context);

    const mcpCall = apiCalls.find((c) => c.url.includes("/mcp"));
    const mcpBody = JSON.parse(mcpCall?.body ?? "{}");
    expect(mcpBody.startDate).toBe("2026-08-14T08:00:00+03:00");
  });

  it("iki fetch ayni TGT'yi kullanir — CAS'e tek istek atilir", async () => {
    const plugin = makePlugin();
    const context = makeContext();
    await plugin.activate(context);

    await plugin.fetch(context);
    await plugin.fetch(context);

    const casCalls = fetchFn.mock.calls.filter(([url]) => url === CAS_URL);
    expect(casCalls).toHaveLength(1);
    expect(apiCalls.length).toBe(4);
  });

  it("gecersiz konfigurasyonda activate firlatir", async () => {
    const plugin = makePlugin();
    const context = makeContext();
    context.config = { username: "", password: "", casUrl: "", baseUrl: "", series: [] };

    await expect(plugin.activate(context)).rejects.toThrow(/username/i);
  });

  it("bozuk satirlari sessizce atlar", async () => {
    fetchFn = vi.fn<FetchLike>(async (url: string, init?: RequestInit) => {
      if (url === CAS_URL) {
        return casResponse("TGT-test-1");
      }
      apiCalls.push({
        url,
        body: init?.body as string | undefined,
        tgt: ((init?.headers ?? {}) as Record<string, string>)["TGT"] ?? "",
      });
      return apiResponse(200, {
        items: [
          { date: "gecersiz-tarih", price: 10, systemMarginalPrice: 10 },
          { date: "2026-08-14T10:00:00+03:00", price: "sayi-degil", systemMarginalPrice: "sayi-degil" },
          { date: "2026-08-14T12:00:00+03:00", price: 42, systemMarginalPrice: 42 },
        ],
      });
    });
    vi.stubGlobal("fetch", fetchFn);
    const plugin = makePlugin();
    const context = makeContext();
    await plugin.activate(context);

    // 2 seri (PTF, SMF) × 3 satir — her seriden yalnizca 1 gecerli satir kalir
    const points = await plugin.fetch(context);

    expect(points).toHaveLength(2);
    expect(points.every((p) => p.value === 42)).toBe(true);
  });

  it("activate'ten once fetch firlatir", async () => {
    const plugin = makePlugin();
    await expect(plugin.fetch(makeContext())).rejects.toThrow(/activate/i);
  });
});
