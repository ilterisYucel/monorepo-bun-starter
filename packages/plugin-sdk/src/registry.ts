import type { PluginContext } from "./context";
import type { IPlugin, PluginHealth } from "./plugin";
import { SDK_VERSION } from "./sdk";
import { SemVerRange } from "./sdk-version";

export interface PluginRegistration<C extends PluginContext = PluginContext> {
  plugin: IPlugin<C>;
  /** Plugin'in nereden geldigi: "static:<name>" veya "dir:<yol>" */
  origin: string;
  /** Runtime pluginleri icin plugin dizini */
  dir: string | undefined;
}

/**
 * Kayitli pluginlerin tek otoritesi.
 * Isim cakismasi ve SDK versiyon uyumu burada denetlenir.
 */
export class PluginRegistry<C extends PluginContext = PluginContext> {
  private readonly entries = new Map<string, PluginRegistration<C>>();

  /** Komut — plugin'i kaydeder. Cakisma veya SDK uyumsuzlugunda firlatir. */
  register(plugin: IPlugin<C>, origin: string, dir?: string): void {
    const manifest = plugin.manifest();
    const existing = this.entries.get(manifest.name);
    if (existing) {
      throw new Error(
        `[PluginRegistry] Plugin zaten kayitli: "${manifest.name}" (${existing.origin}) — yeni: ${origin}`,
      );
    }
    const range = new SemVerRange(manifest.sdkVersion);
    if (!range.includes(SDK_VERSION)) {
      throw new Error(
        `[PluginRegistry] SDK uyumsuzlugu: "${manifest.name}" "${manifest.sdkVersion}" bekliyor, SDK ${SDK_VERSION}`,
      );
    }
    this.entries.set(manifest.name, { plugin, origin, dir });
  }

  /** Sorgu — tum kayitlari dondurur. */
  registrations(): PluginRegistration<C>[] {
    return Array.from(this.entries.values());
  }

  /** Sorgu — isimle plugin bulur. */
  find(name: string): IPlugin<C> | undefined {
    return this.entries.get(name)?.plugin;
  }

  /** Sorgu — kayitli plugin isimleri. */
  names(): string[] {
    return Array.from(this.entries.keys());
  }

  /** Komut — tum pluginleri deactivate eder ve kayitlari temizler. */
  async deactivateAll(): Promise<void> {
    const results = await Promise.allSettled(
      this.registrations().map((r) => r.plugin.deactivate()),
    );
    for (const result of results) {
      if (result.status === "rejected") {
        console.warn(`[PluginRegistry] deactivate basarisiz: ${String(result.reason)}`);
      }
    }
    this.entries.clear();
  }

  /** Sorgu — tum pluginlerin saglik durumunu dondurur. */
  health(): Record<string, PluginHealth> {
    const result: Record<string, PluginHealth> = {};
    for (const [name, registration] of this.entries) {
      try {
        result[name] = registration.plugin.health();
      } catch (err) {
        result[name] = { status: "unhealthy", message: String(err) };
      }
    }
    return result;
  }
}
