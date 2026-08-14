import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { PluginContext } from "./context";
import type { IPlugin } from "./plugin";
import { PluginLoader } from "./loader";
import { PluginRegistry } from "./registry";
import { DirectoryPluginSource, StaticPluginSource } from "./sources";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.allSettled(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })));
  tempDirs.length = 0;
});

function makePlugin(name: string): IPlugin {
  return {
    manifest: () => ({
      name,
      version: "1.0.0",
      kind: "custom",
      sdkVersion: ">=1.0.0 <2.0.0",
      description: "test plugin",
    }),
    activate: async () => {},
    deactivate: async () => {},
    health: () => ({ status: "healthy" as const }),
  };
}

const PLUGIN_MODULE = `export const plugin = {
  manifest: () => ({ name: "customer-x", version: "1.0.0", kind: "custom", sdkVersion: ">=1.0.0 <2.0.0", description: "musteri plugin" }),
  activate: async () => {},
  deactivate: async () => {},
  health: () => ({ status: "healthy" }),
};
`;

async function makeTempPluginDir(): Promise<string> {
  const base = await mkdtemp(join(tmpdir(), "plugin-sdk-test-"));
  tempDirs.push(base);
  const pluginDir = join(base, "customer-x");
  await mkdir(pluginDir, { recursive: true });
  await writeFile(join(pluginDir, "plugin.json"), JSON.stringify({ entry: "./index.js" }));
  await writeFile(join(pluginDir, "index.js"), PLUGIN_MODULE);
  return base;
}

describe("PluginLoader", () => {
  it("statik kaynaktaki pluginleri kaydeder", async () => {
    const registry = new PluginRegistry<PluginContext>();
    const loader = new PluginLoader(registry, [
      new StaticPluginSource([makePlugin("a"), makePlugin("b")]),
    ]);

    await loader.load();

    expect(registry.names()).toEqual(["a", "b"]);
  });

  it("dizin kaynagindan plugin yukler (runtime plugin)", async () => {
    const dir = await makeTempPluginDir();
    const registry = new PluginRegistry<PluginContext>();
    const loader = new PluginLoader(registry, [new DirectoryPluginSource(dir)]);

    await loader.load();

    const found = registry.find("customer-x");
    expect(found).toBeDefined();
    expect(found!.manifest().name).toBe("customer-x");
    expect(registry.registrations()[0]?.origin).toContain("dir:");
    expect(registry.registrations()[0]?.dir).toBe(join(dir, "customer-x"));
  });

  it("olmayan dizinde bos doner ve hata firlatmaz", async () => {
    const registry = new PluginRegistry<PluginContext>();
    const loader = new PluginLoader(registry, [new DirectoryPluginSource("/var/yok/pluginler")]);

    await loader.load();

    expect(registry.names()).toEqual([]);
  });

  it("ayni isim statik ve dizin kaynagindan gelirse ilki kazanir", async () => {
    const dir = await makeTempPluginDir();
    // dizin plugin'inin adi "customer-x" — statikte ayni ad olsun
    const registry = new PluginRegistry<PluginContext>();
    const loader = new PluginLoader(registry, [
      new StaticPluginSource([makePlugin("customer-x")]),
      new DirectoryPluginSource(dir),
    ]);

    await loader.load();

    expect(registry.names()).toEqual(["customer-x"]);
    expect(registry.registrations()[0]?.origin).toBe("static:customer-x");
  });

  it("manifest'siz dizin girisini atlar", async () => {
    const base = await mkdtemp(join(tmpdir(), "plugin-sdk-test-"));
    tempDirs.push(base);
    await mkdir(join(base, "eksik-manifest"), { recursive: true });

    const registry = new PluginRegistry<PluginContext>();
    const loader = new PluginLoader(registry, [new DirectoryPluginSource(base)]);

    await loader.load();

    expect(registry.names()).toEqual([]);
  });
});
