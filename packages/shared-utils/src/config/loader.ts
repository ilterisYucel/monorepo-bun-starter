/**
 * ConfigLoader — merkezi konfigürasyon yoneticisi.
 *
 * Kaynaklari oncelik sirasina gore okur, degerleri dogrular,
 * runtime degisiklikleri izler ve subscriber'lara bildirir.
 *
 * Kullanim:
 *   const loader = new ConfigLoader(ALL_DEFINITIONS, [new EnvSource(), ...]);
 *   await loader.load();
 *   const port = loader.get<number>("server.port");
 *   loader.onChange("timescale.retentionAfter", (e) => { ... });
 *   loader.watch();
 */

import type {
  ConfigDefinition,
  ConfigSource,
  ConfigChangeEvent,
  ConfigChangeHandler,
  ConfigValues,
} from "./types";
import { applyUnit } from "./units";

export class ConfigLoader {
  private values: Map<string, unknown> = new Map();
  private listeners: Map<string, Set<ConfigChangeHandler>> = new Map();
  private sortedSources: ConfigSource[];
  private defsByKey: Map<string, ConfigDefinition>;
  private loaded = false;

  constructor(
    private readonly definitions: ConfigDefinition[],
    sources: ConfigSource[],
  ) {
    this.sortedSources = [...sources].sort(
      (a, b) => a.priority - b.priority,
    );
    this.defsByKey = new Map(definitions.map((d) => [d.key, d]));
  }

  // =========================================================================
  // Load & Validate
  // =========================================================================

  /**
   * Tum tanimli konfigürasyonlari kaynaklardan yukler ve dogrular.
   * Yalnizca bir kez cagrilmalidir. Sonraki yuklemeler icin reload() kullanin.
   *
   * @throws herhangi bir tanim dogrulamayi gecemezse
   */
  load(): void {
    for (const def of this.definitions) {
      const value = this.resolve(def);
      this.values.set(def.key, value);
    }
    this.loaded = true;
  }

  /**
   * Konfigürasyon degisikliklerini yeniden yukler.
   * Sadece degisen degerler icin onChange listener'larini tetikler.
   * Watch mekanizmasi tarafindan otomatik cagrilir.
   */
  reload(): void {
    if (!this.loaded) {
      return this.load();
    }

    for (const def of this.definitions) {
      const oldValue = this.values.get(def.key);
      const newValue = this.resolve(def);

      if (oldValue !== newValue) {
        this.values.set(def.key, newValue);

        // onUpdate callback
        if (def.onUpdate) {
          try {
            def.onUpdate(newValue as any, oldValue as any);
          } catch (err) {
            console.error(
              `[ConfigLoader] onUpdate hata (${def.key}):`,
              err,
            );
          }
        }

        // onChange subscriber'lar
        const event: ConfigChangeEvent = {
          key: def.key,
          oldValue,
          newValue,
          restartRequired: def.restartOnChange ?? false,
        };

        const subs = this.listeners.get(def.key);
        if (subs) {
          for (const handler of subs) {
            try {
              handler(event);
            } catch (err) {
              console.error(
                `[ConfigLoader] onChange hata (${def.key}):`,
                err,
              );
            }
          }
        }
      }
    }
  }

  // =========================================================================
  // Access
  // =========================================================================

  /**
   * Dogrulanmis konfigürasyon degerini dondurur.
   *
   * @param key — ConfigDefinition.key (ornegin: "server.port")
   * @returns dogrulanmis ve normalize edilmis deger
   * @throws key bulunamazsa
   */
  get<T>(key: string): T {
    if (!this.values.has(key)) {
      throw new Error(`[ConfigLoader] Tanimsiz konfigürasyon anahtari: "${key}"`);
    }
    return this.values.get(key) as T;
  }

  /**
   * Tum yuklenmis degerleri duz obje olarak dondurur.
   */
  all(): ConfigValues {
    const result: ConfigValues = {};
    for (const def of this.definitions) {
      result[def.key] = this.values.get(def.key);
    }
    return result;
  }

  /**
   * Gizli degerlerin maskelendigi, loglanabilir bir obje dondurur.
   * secret: true olan tanimlar "***" olarak gosterilir.
   */
  redacted(): Record<string, string> {
    const result: Record<string, string> = {};
    for (const def of this.definitions) {
      const value = this.values.get(def.key);
      if (def.secret) {
        result[def.key] = "***";
      } else if (value === undefined) {
        result[def.key] = "<undefined>";
      } else if (value === null) {
        result[def.key] = "<null>";
      } else {
        result[def.key] = String(value);
      }
    }
    return result;
  }

  // =========================================================================
  // Subscribe & Watch
  // =========================================================================

  /**
   * Belirli bir anahtar icin degisiklik dinleyicisi kaydeder.
   *
   * @param key — ConfigDefinition.key
   * @param handler — degisiklik oldugunda cagrilacak fonksiyon
   * @returns unsubscribe fonksiyonu
   */
  onChange(key: string, handler: ConfigChangeHandler): () => void {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key)!.add(handler);

    return () => {
      const subs = this.listeners.get(key);
      if (subs) {
        subs.delete(handler);
        if (subs.size === 0) {
          this.listeners.delete(key);
        }
      }
    };
  }

  /**
   * Dosya tabanli kaynaklari izlemeye baslar.
   * Bir dosya degistiginde otomatik olarak reload() cagrilir.
   */
  watch(): void {
    for (const source of this.sortedSources) {
      if (source.watch) {
        source.watch(() => {
          console.log(
            `[ConfigLoader] Kaynak degisti: ${source.name}, yeniden yukleniyor...`,
          );
          this.reload();
        });
      }
    }
  }

  /**
   * Tum kaynak izlemelerini durdurur.
   */
  unwatch(): void {
    for (const source of this.sortedSources) {
      if (source.unwatch) {
        source.unwatch();
      }
    }
  }

  // =========================================================================
  // Health
  // =========================================================================

  /**
   * Konfigürasyon sisteminin saglik durumunu kontrol eder.
   * Tum kaynaklarin erisilebilir olup olmadigini test eder.
   */
  health(): { healthy: boolean; sources: Record<string, boolean> } {
    const sourceStatus: Record<string, boolean> = {};
    let allHealthy = true;

    for (const source of this.sortedSources) {
      try {
        const testDef: ConfigDefinition = {
          key: "_health_check",
          default: null,
        };
        source.read(testDef);
        sourceStatus[source.name] = true;
      } catch {
        sourceStatus[source.name] = false;
        allHealthy = false;
      }
    }

    return { healthy: allHealthy, sources: sourceStatus };
  }

  /**
   * Yüklenen konfigürasyonlarin genel gecerligini kontrol eder.
   * Tum degerleri yeniden dogrular.
   *
   * @returns tum tanimlar gecerliyse true
   */
  validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const def of this.definitions) {
      try {
        const raw = this.values.get(def.key);
        this.validateValue(def, raw);
      } catch (err) {
        errors.push(`${def.key}: ${String(err)}`);
      }
    }

    return { valid: errors.length === 0, errors };
  }

  // =========================================================================
  // Private helpers
  // =========================================================================

  /**
   * Tek bir ConfigDefinition icin kaynak zincirini tarar.
   * Ilk bulunan degeri dondurur, hicbirinde yoksa varsayilani kullanir.
   */
  private resolve<T>(def: ConfigDefinition<T>): T {
    for (const source of this.sortedSources) {
      const value = source.read(def);
      if (value !== undefined) {
        return this.validateValue(def, value);
      }
    }
    return this.validateValue(def, def.default);
  }

  /**
   * Ham degeri dogrular ve normalize eder.
   * Sirasiyla: birim uygulama → validate fonksiyonu
   */
  private validateValue<T>(def: ConfigDefinition<T>, raw: unknown): T {
    let value: unknown = raw;

    // Birim normalizasyonu
    if (def.unit && typeof value === "string") {
      value = applyUnit(def.unit, value);
    }

    // Ozel dogrulama
    if (def.validate) {
      try {
        value = def.validate(value);
      } catch (err) {
        const desc = def.description ? ` (${def.description})` : "";
        throw new Error(
          `[ConfigLoader] "${def.key}" dogrulama hatasi${desc}: ${String(err)}`,
        );
      }
    }

    return value as T;
  }
}
