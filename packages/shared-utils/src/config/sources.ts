/**
 * ConfigSource implementasyonlari.
 *
 * Oncelik sirasina gore (dusuk = once okunur):
 *   ObjectSource:  5   (programatik override, test)
 *   EnvSource:    10   (process.env)
 *   DotenvSource: 20   (.env dosyasi)
 *   JsonFileSource: 30 (JSON config dosyasi)
 *   YamlFileSource: 30 (YAML config dosyasi)
 */

import { readFileSync, existsSync, watch as fsWatch } from "node:fs";
import type { FSWatcher } from "node:fs";
import type { ConfigDefinition, ConfigSource } from "./types";

/**
 * process.env'den okuma yapan kaynak.
 * Oncelik: 10
 */
export class EnvSource implements ConfigSource {
  readonly name = "env";
  readonly priority = 10;

  read<T>(def: ConfigDefinition<T>): T | undefined {
    if (!def.env) return undefined;
    const raw = process.env[def.env];
    if (raw === undefined) return undefined;

    if (def.unit || typeof def.default === "number") {
      return this.coerce(raw, def) as T | undefined;
    }
    return raw as unknown as T;
  }

  private coerce(raw: string, _def: ConfigDefinition): string | number | undefined {
    const num = Number(raw);
    if (!isNaN(num) && raw.trim() !== "") return num;
    return raw;
  }
}

/**
 * .env dosyasindan okuma yapan kaynak.
 * Basit bir .env parser icerir (dotenv paketine bagimlilik yok).
 * Oncelik: 20
 */
export class DotenvSource implements ConfigSource {
  readonly name: string;
  readonly priority = 20;
  private cache: Map<string, string> | null = null;
  private fileExists: boolean;

  constructor(private readonly filePath: string) {
    this.name = `dotenv:${filePath}`;
    this.fileExists = existsSync(filePath);
  }

  read<T>(def: ConfigDefinition<T>): T | undefined {
    if (!def.env || !this.fileExists) return undefined;

    if (this.cache === null) {
      this.cache = this.load();
    }

    const raw = this.cache.get(def.env);
    if (raw === undefined) return undefined;

    if (typeof def.default === "number" && def.unit === undefined) {
      const num = Number(raw);
      if (!isNaN(num)) return num as unknown as T;
    }

    return raw as unknown as T;
  }

  private load(): Map<string, string> {
    const map = new Map<string, string>();
    try {
      const content = readFileSync(this.filePath, "utf-8");
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIndex = trimmed.indexOf("=");
        if (eqIndex === -1) continue;
        const key = trimmed.slice(0, eqIndex).trim();
        let value = trimmed.slice(eqIndex + 1).trim();
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        map.set(key, value);
      }
    } catch {
      // Dosya okunamadiysa bos map dondur
    }
    return map;
  }

  watch(onChange: () => void): void {
    if (!this.fileExists) return;
    let fsWatcher: FSWatcher | null = null;
    try {
      fsWatcher = fsWatch(this.filePath, () => {
        this.cache = null;
        onChange();
      });
    } catch {
      // watch desteklenmiyorsa ignore
    }

    const unwatch = () => {
      if (fsWatcher) fsWatcher.close();
    };
    (this as any)._unwatch = unwatch;
  }

  unwatch(): void {
    if ((this as any)._unwatch) {
      (this as any)._unwatch();
    }
  }
}

/**
 * JSON dosyasindan okuma yapan kaynak.
 * Icerigin tamamini parse eder, filePath ile nested degeri arar.
 * Oncelik: 30
 */
export class JsonFileSource implements ConfigSource {
  readonly name: string;
  readonly priority = 30;
  private cache: Record<string, unknown> | null = null;
  private fileExists: boolean;

  constructor(private readonly filePath: string) {
    this.name = `json:${filePath}`;
    this.fileExists = existsSync(filePath);
  }

  read<T>(def: ConfigDefinition<T>): T | undefined {
    if (!def.filePath || !this.fileExists) return undefined;

    if (this.cache === null) {
      try {
        const raw = readFileSync(this.filePath, "utf-8");
        this.cache = JSON.parse(raw) as Record<string, unknown>;
      } catch {
        this.cache = {};
      }
    }

    return this.resolvePath(this.cache, def.filePath) as T | undefined;
  }

  private resolvePath(
    obj: Record<string, unknown>,
    path: string,
  ): unknown {
    const parts = path.split(".");
    let current: unknown = obj;
    for (const part of parts) {
      if (current === null || current === undefined) return undefined;
      if (typeof current !== "object") return undefined;
      current = (current as Record<string, unknown>)[part];
    }
    return current;
  }

  watch(onChange: () => void): void {
    if (!this.fileExists) return;
    let fsWatcher: FSWatcher | null = null;
    try {
      fsWatcher = fsWatch(this.filePath, () => {
        this.cache = null;
        onChange();
      });
    } catch {
      // watch desteklenmiyorsa ignore
    }

    const unwatch = () => {
      if (fsWatcher) fsWatcher.close();
    };
    (this as any)._unwatch = unwatch;
  }

  unwatch(): void {
    if ((this as any)._unwatch) {
      (this as any)._unwatch();
    }
  }
}

/**
 * YAML dosyasindan okuma yapan kaynak.
 * `yaml` paketine bagimlidir — projede yuklu degilse hata vermez,
 * sadece dosyayi okuyamaz.
 * Oncelik: 30
 */
export class YamlFileSource implements ConfigSource {
  readonly name: string;
  readonly priority = 30;
  private cache: Record<string, unknown> | null = null;
  private fileExists: boolean;
  private yamlAvailable: boolean;

  constructor(private readonly filePath: string) {
    this.name = `yaml:${filePath}`;
    this.fileExists = existsSync(filePath);
    try {
      require("yaml");
      this.yamlAvailable = true;
    } catch {
      this.yamlAvailable = false;
    }
  }

  read<T>(def: ConfigDefinition<T>): T | undefined {
    if (!def.filePath || !this.fileExists || !this.yamlAvailable) return undefined;

    if (this.cache === null) {
      try {
        const raw = readFileSync(this.filePath, "utf-8");
        const { parse } = require("yaml") as { parse: (s: string) => unknown };
        this.cache = parse(raw) as Record<string, unknown>;
      } catch {
        this.cache = {};
      }
    }

    return this.resolvePath(this.cache, def.filePath) as T | undefined;
  }

  private resolvePath(
    obj: Record<string, unknown>,
    path: string,
  ): unknown {
    const parts = path.split(".");
    let current: unknown = obj;
    for (const part of parts) {
      if (current === null || current === undefined) return undefined;
      if (typeof current !== "object") return undefined;
      current = (current as Record<string, unknown>)[part];
    }
    return current;
  }
}

/**
 * Programatik override'lar icin kaynak.
 * Test ve DI konteyner senaryolari icin kullanilir.
 * Oncelik: 5 (en yuksek — tum diger kaynaklari ezer)
 */
export class ObjectSource implements ConfigSource {
  readonly name = "override";
  readonly priority = 5;

  constructor(private readonly values: Record<string, unknown>) {}

  read<T>(def: ConfigDefinition<T>): T | undefined {
    if (def.env && def.env in this.values) {
      return this.values[def.env] as T;
    }
    return this.values[def.key] as T | undefined;
  }
}
