import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import type { PluginContext } from "./context";
import type { IPlugin } from "./plugin";

export interface DiscoveredPlugin<C extends PluginContext = PluginContext> {
  plugin: IPlugin<C>;
  origin: string;
  /** Runtime pluginleri icin plugin dizini */
  dir?: string;
}

/**
 * Plugin kaynagi — loader'a plugin adaylarini saglar.
 * Strateji pattern: statik (workspace paketleri) ve dizin (runtime) kaynaklari.
 */
export interface PluginSource<C extends PluginContext = PluginContext> {
  /** Sorgu — kaynak adi (log icin). */
  name(): string;

  /** Sorgu — kesfedilen pluginleri dondurur. */
  discover(): Promise<DiscoveredPlugin<C>[]>;
}

/**
 * Workspace paketlerindeki pluginler — kod tarafinda dogrudan enjekte edilir.
 * Type-safe, Nx build duzeniyle derlenir.
 */
export class StaticPluginSource<C extends PluginContext = PluginContext>
  implements PluginSource<C>
{
  constructor(private readonly items: IPlugin<C>[]) {}

  name(): string {
    return "static";
  }

  async discover(): Promise<DiscoveredPlugin<C>[]> {
    return this.items.map((plugin) => ({
      plugin,
      origin: `static:${plugin.manifest().name}`,
    }));
  }
}

interface DirectoryManifest {
  name?: string;
  entry?: string;
}

/**
 * Runtime plugin dizini — musteriye ozel pluginler icin.
 *
 * Duzen: `<dizin>/<plugin-adi>/plugin.json` + entry modulu.
 * plugin.json: `{ "entry": "./index.js" }` (entry varsayilan: ./index.js).
 * Entry modulu named export `plugin` (IPlugin ornegi) icermelidir.
 */
export class DirectoryPluginSource<C extends PluginContext = PluginContext>
  implements PluginSource<C>
{
  constructor(private readonly directory: string) {}

  name(): string {
    return `directory:${this.directory}`;
  }

  async discover(): Promise<DiscoveredPlugin<C>[]> {
    let entries;
    try {
      entries = await readdir(this.directory, { withFileTypes: true });
    } catch {
      console.warn(`[DirectoryPluginSource] Plugin dizini bulunamadi: ${this.directory}`);
      return [];
    }

    const subdirs = entries.filter((e) => e.isDirectory());
    const results = await Promise.allSettled(
      subdirs.map(async (sub) => {
        const pluginDir = join(this.directory, sub.name);
        const manifest = await this.readManifest(pluginDir);
        const entryPath = join(pluginDir, manifest.entry ?? "./index.js");
        const module = await import(pathToFileURL(entryPath).href);
        // ELEGANT-EXCEPTION: dinamik yuklenen modulun tip bilgisi calisma zamaninda yoktur.
        // Bu, tip siniri tek noktasidir — named export "plugin" varligi veri olarak kontrol edilir,
        // tip denetimi (instanceof/reflection) yapilmaz.
        const plugin = (module as { plugin?: IPlugin<C> }).plugin;
        if (!plugin) {
          throw new Error(
            `[DirectoryPluginSource] "${pluginDir}" modulu named export "plugin" icermiyor`,
          );
        }
        return { plugin, origin: `dir:${pluginDir}`, dir: pluginDir };
      }),
    );

    const discovered: DiscoveredPlugin<C>[] = [];
    for (const result of results) {
      if (result.status === "fulfilled") {
        discovered.push(result.value);
      } else {
        console.warn(`[DirectoryPluginSource] Plugin yuklenemedi: ${String(result.reason)}`);
      }
    }
    return discovered;
  }

  private async readManifest(pluginDir: string): Promise<DirectoryManifest> {
    try {
      const raw = await readFile(join(pluginDir, "plugin.json"), "utf-8");
      const parsed: unknown = JSON.parse(raw);
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
        throw new Error("plugin.json JSON obje olmali");
      }
      return parsed as DirectoryManifest;
    } catch (err) {
      throw new Error(
        `[DirectoryPluginSource] "${pluginDir}" icinde plugin.json okunamadi: ${String(err)}`,
      );
    }
  }
}
