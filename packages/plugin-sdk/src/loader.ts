import type { PluginContext } from "./context";
import type { PluginRegistry } from "./registry";
import type { PluginSource } from "./sources";

/**
 * PluginLoader — kaynaklari tarar, bulduklarini registry'ye kaydeder.
 * Tek bir kaynak hatali olsa bile diger kaynaklar yuklenmeye devam eder.
 * Hem integration hem management servislerinde ayni sinif kullanilir.
 */
export class PluginLoader<C extends PluginContext = PluginContext> {
  constructor(
    private readonly registry: PluginRegistry<C>,
    private readonly sources: PluginSource<C>[],
  ) {}

  /** Komut — tum kaynaklari yukler, registry'yi dondurur (akici kullanim icin). */
  async load(): Promise<PluginRegistry<C>> {
    for (const source of this.sources) {
      let discovered;
      try {
        discovered = await source.discover();
      } catch (err) {
        console.error(`[PluginLoader] Kaynak hatasi (${source.name()}): ${String(err)}`);
        continue;
      }
      for (const item of discovered) {
        try {
          this.registry.register(item.plugin, item.origin, item.dir);
          console.log(
            `[PluginLoader] Plugin kaydedildi: ${item.plugin.manifest().name} (${item.origin})`,
          );
        } catch (err) {
          console.warn(`[PluginLoader] ${item.origin} kaydedilemedi: ${String(err)}`);
        }
      }
    }
    return this.registry;
  }

  /** Komut — tum pluginleri deactivate eder. */
  async unload(): Promise<void> {
    await this.registry.deactivateAll();
  }
}
