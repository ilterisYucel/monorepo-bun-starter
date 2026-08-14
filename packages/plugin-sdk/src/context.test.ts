import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  FilePluginStateStore,
  JsonFilePluginConfigSource,
  PluginContextFactory,
} from "./context";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.allSettled(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })));
  tempDirs.length = 0;
});

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "plugin-ctx-test-"));
  tempDirs.push(dir);
  return dir;
}

describe("FilePluginStateStore", () => {
  it("yazma/okuma/silme turu calisir", async () => {
    const dir = await makeTempDir();
    const store = new FilePluginStateStore(join(dir, "state.json"));

    expect(await store.read("cursor")).toBeUndefined();

    await store.write("cursor", "2026-08-14T10:00:00Z");
    await store.write("count", 42);

    expect(await store.read("cursor")).toBe("2026-08-14T10:00:00Z");
    expect(await store.read("count")).toBe(42);

    await store.remove("cursor");
    expect(await store.read("cursor")).toBeUndefined();
    expect(await store.read("count")).toBe(42);
  });

  it("bozuk dosya durumunda bos obje doner", async () => {
    const dir = await makeTempDir();
    const file = join(dir, "state.json");
    await writeFile(file, "{ bozuk json", "utf-8");
    const store = new FilePluginStateStore(file);

    expect(await store.read("cursor")).toBeUndefined();
    await store.write("cursor", 1);
    expect(await store.read("cursor")).toBe(1);
  });
});

describe("JsonFilePluginConfigSource + PluginContextFactory", () => {
  it("config dosyasini yukler ve context olusturur", async () => {
    const dir = await makeTempDir();
    const configDir = join(dir, "config");
    await mkdir(configDir, { recursive: true });
    await writeFile(
      join(configDir, "epias-market-prices.json"),
      JSON.stringify({ clientId: "test-id", intervalMs: 3600000 }),
    );

    const factory = new PluginContextFactory(
      new JsonFilePluginConfigSource(configDir),
      join(dir, "state"),
    );
    const context = await factory.create("epias-market-prices", "/plugins/epias-market-prices");

    expect(context.config).toEqual({ clientId: "test-id", intervalMs: 3600000 });
    expect(context.pluginDir).toBe("/plugins/epias-market-prices");
    expect(context.logger).toBeDefined();

    await context.state.write("cursor", "x");
    expect(await context.state.read("cursor")).toBe("x");
  });

  it("config dosyasi yoksa bos obje doner", async () => {
    const dir = await makeTempDir();
    const factory = new PluginContextFactory(
      new JsonFilePluginConfigSource(join(dir, "config")),
      join(dir, "state"),
    );

    const context = await factory.create("bilinmeyen-plugin", dir);
    expect(context.config).toEqual({});
  });
});
