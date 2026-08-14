import { describe, expect, it } from "vitest";
import type { PluginContext } from "./context";
import type { IPlugin } from "./plugin";
import { PluginRegistry } from "./registry";

function makePlugin(
  name: string,
  options?: { sdkVersion?: string; deactivates?: () => void },
): IPlugin {
  return {
    manifest: () => ({
      name,
      version: "1.0.0",
      kind: "custom",
      sdkVersion: options?.sdkVersion ?? ">=1.0.0 <2.0.0",
      description: "test plugin",
    }),
    activate: async () => {},
    deactivate: async () => {
      options?.deactivates?.();
    },
    health: () => ({ status: "healthy" as const }),
  };
}

describe("PluginRegistry", () => {
  it("plugin kaydeder ve sorgular", () => {
    const registry = new PluginRegistry<PluginContext>();
    registry.register(makePlugin("a"), "static:a");

    expect(registry.names()).toEqual(["a"]);
    expect(registry.find("a")).toBeDefined();
    expect(registry.find("yok")).toBeUndefined();
    expect(registry.registrations()[0]?.origin).toBe("static:a");
  });

  it("ayni isimdeki ikinci kaydi reddeder", () => {
    const registry = new PluginRegistry<PluginContext>();
    registry.register(makePlugin("a"), "static:a");

    expect(() => registry.register(makePlugin("a"), "dir:/plugins/a")).toThrow(
      /zaten kayitli/i,
    );
  });

  it("SDK versiyon uyumsuzlugunu reddeder", () => {
    const registry = new PluginRegistry<PluginContext>();
    expect(() =>
      registry.register(makePlugin("eski", { sdkVersion: ">=0.9.0 <1.0.0" }), "static:eski"),
    ).toThrow(/SDK uyumsuzlugu/i);
  });

  it("deactivateAll tum pluginleri deactivate eder ve temizler", async () => {
    const registry = new PluginRegistry<PluginContext>();
    let deactivated = 0;
    registry.register(makePlugin("a", { deactivates: () => deactivated++ }), "static:a");
    registry.register(makePlugin("b", { deactivates: () => deactivated++ }), "static:b");

    await registry.deactivateAll();

    expect(deactivated).toBe(2);
    expect(registry.names()).toEqual([]);
  });

  it("health tum pluginleri toplar", () => {
    const registry = new PluginRegistry<PluginContext>();
    registry.register(makePlugin("a"), "static:a");
    registry.register(makePlugin("b"), "static:b");

    const health = registry.health();
    expect(health["a"]?.status).toBe("healthy");
    expect(health["b"]?.status).toBe("healthy");
  });
});
