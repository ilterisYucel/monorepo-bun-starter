import { describe, expect, it } from "vitest";
import type { PluginContext } from "@gd-monorepo/plugin-sdk";
import type { HttpGateway } from "./http-gateway";
import { EpiasMarketPricesPlugin } from "./plugin";

interface FakeGatewayCall {
  url: string;
  headers: Record<string, string>;
}

class FakeGateway implements HttpGateway {
  calls: FakeGatewayCall[] = [];
  constructor(private readonly responder: (path: string) => Record<string, unknown>[]) {}

  async getJson<T>(url: string, headers: Record<string, string>): Promise<T> {
    this.calls.push({ url, headers });
    const path = new URL(url).pathname;
    return this.responder(path) as T;
  }
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
      clientId: "test-client-id",
      baseUrl: "https://example.epias/api/v1",
      series: [
        { name: "MCP", path: "/markets/dam/data/mcp", unit: "TRY/MWh", dateField: "date", valueField: "price" },
        { name: "SMF", path: "/markets/smp/data/smp", unit: "TRY/MWh", dateField: "date", valueField: "price" },
      ],
    },
    pluginDir: "/plugins/epias-market-prices",
    state: new MemoryStateStore() as never,
  };
}

describe("EpiasMarketPricesPlugin", () => {
  it("manifest ve schedule dondurur", async () => {
    const plugin = new EpiasMarketPricesPlugin(new FakeGateway(() => []));
    await plugin.activate(makeContext());

    expect(plugin.manifest().name).toBe("epias-market-prices");
    expect(plugin.manifest().kind).toBe("integration");
    expect(plugin.schedule()).toEqual({ mode: "interval", everyMs: 3600000 });
  });

  it("fetch — satirlari MarketDataPoint'e cevirir ve cursor yazar", async () => {
    const gateway = new FakeGateway((path) => {
      if (path.includes("mcp")) {
        return [{ date: "2026-08-14T10:00:00+03:00", price: 1900.5 }];
      }
      return [{ date: "2026-08-14T11:00:00+03:00", price: 1950.0 }];
    });
    const plugin = new EpiasMarketPricesPlugin(gateway);
    const context = makeContext();
    await plugin.activate(context);

    const points = await plugin.fetch(context, {
      from: "2026-08-14T00:00:00Z",
      to: "2026-08-14T23:59:59Z",
    });

    expect(points).toHaveLength(2);
    expect(points[0]).toMatchObject({
      source: "epias",
      series: "MCP",
      value: 1900.5,
      unit: "TRY/MWh",
    });
    expect(points[1]?.series).toBe("SMF");
    expect(points[1]?.timestamp).toBe("2026-08-14T08:00:00.000Z");

    expect(gateway.calls[0]?.headers["X-IBM-Client-Id"]).toBe("test-client-id");
    expect(await context.state.read("lastFetchTo")).toBe("2026-08-14T23:59:59Z");
  });

  it("fetch — pencere verilmezse cursor'dan devam eder", async () => {
    const gateway = new FakeGateway(() => []);
    const plugin = new EpiasMarketPricesPlugin(gateway);
    const context = makeContext();
    await context.state.write("lastFetchTo", "2026-08-14T05:00:00.000Z");
    await plugin.activate(context);

    await plugin.fetch(context);

    expect(gateway.calls[0]?.url).toContain("startDate=2026-08-14T05%3A00%3A00.000Z");
  });

  it("gecersiz konfigurasyonda activate firlatir", async () => {
    const plugin = new EpiasMarketPricesPlugin(new FakeGateway(() => []));
    const context = makeContext();
    context.config = { clientId: "", baseUrl: "", series: [] };

    await expect(plugin.activate(context)).rejects.toThrow(/clientId/i);
  });

  it("bozuk satirlari sessizce atlar", async () => {
    const gateway = new FakeGateway(() => [
      { date: "gecersiz-tarih", price: 10 },
      { date: "2026-08-14T10:00:00+03:00", price: "sayi-degil" },
      { date: "2026-08-14T12:00:00+03:00", price: 42 },
    ]);
    const plugin = new EpiasMarketPricesPlugin(gateway);
    const context = makeContext();
    await plugin.activate(context);

    // 2 seri (MCP, SMF) × 3 satir — her seriden yalnizca 1 gecerli satir kalir
    const points = await plugin.fetch(context);

    expect(points).toHaveLength(2);
    expect(points.every((p) => p.value === 42)).toBe(true);
  });

  it("activate'ten once fetch firlatir", async () => {
    const plugin = new EpiasMarketPricesPlugin(new FakeGateway(() => []));
    await expect(plugin.fetch(makeContext())).rejects.toThrow(/activate/i);
  });
});
