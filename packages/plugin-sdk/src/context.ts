import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

/**
 * Plugin loglayicisi — plugin adi otomatik prefix olarak eklenir.
 */
export interface PluginLogger {
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
}

export class ConsolePluginLogger implements PluginLogger {
  constructor(private readonly pluginName: string) {}

  info(message: string): void {
    console.log(`[Plugin:${this.pluginName}] ${message}`);
  }

  warn(message: string): void {
    console.warn(`[Plugin:${this.pluginName}] ${message}`);
  }

  error(message: string): void {
    console.error(`[Plugin:${this.pluginName}] ${message}`);
  }
}

/**
 * Plugin kalici durumu (fetch cursor, son calisma zamani vb.).
 * Veriler JSON dosyasinda saklanir — Redis/DB bagimliligi yoktur.
 */
export interface IPluginStateStore {
  /** Sorgu — anahtar icin kayitli degeri dondurur, yoksa undefined. */
  read(key: string): Promise<unknown>;

  /** Komut — anahtara deger yazar (mevcut veriler korunur). */
  write(key: string, value: unknown): Promise<void>;

  /** Komut — anahtari siler. */
  remove(key: string): Promise<void>;
}

export class FilePluginStateStore implements IPluginStateStore {
  constructor(private readonly filePath: string) {}

  private async load(): Promise<Record<string, unknown>> {
    try {
      const raw = await readFile(this.filePath, "utf-8");
      const parsed: unknown = JSON.parse(raw);
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
        return {};
      }
      return parsed as Record<string, unknown>;
    } catch {
      return {};
    }
  }

  private async save(data: Record<string, unknown>): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });
    const tmp = `${this.filePath}.tmp`;
    await writeFile(tmp, JSON.stringify(data, null, 2), "utf-8");
    await rename(tmp, this.filePath);
  }

  async read(key: string): Promise<unknown> {
    const data = await this.load();
    return data[key];
  }

  async write(key: string, value: unknown): Promise<void> {
    const data = await this.load();
    data[key] = value;
    await this.save(data);
  }

  async remove(key: string): Promise<void> {
    const data = await this.load();
    delete data[key];
    await this.save(data);
  }
}

/**
 * Plugin konfigürasyon kaynagi — servis, plugin adi icin ham degerleri saglar.
 */
export interface PluginConfigSource {
  /** Sorgu — plugin adi icin ham konfigürasyon objesi, yoksa {}. */
  raw(pluginName: string): Promise<Record<string, unknown>>;
}

/**
 * JSON dosya bazli konfigürasyon kaynagi: `<configDir>/<pluginName>.json`.
 */
export class JsonFilePluginConfigSource implements PluginConfigSource {
  constructor(private readonly configDir: string) {}

  async raw(pluginName: string): Promise<Record<string, unknown>> {
    try {
      const raw = await readFile(join(this.configDir, `${pluginName}.json`), "utf-8");
      const parsed: unknown = JSON.parse(raw);
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
        console.warn(
          `[JsonFilePluginConfigSource] ${pluginName}.json gecersiz — JSON obje bekleniyordu`,
        );
        return {};
      }
      return parsed as Record<string, unknown>;
    } catch {
      return {};
    }
  }
}

/**
 * Plugin'in calisma aninda eristigi servislerin toplami.
 * Servisler bu objeyi olusturup activate() ile plugin'e gecirir (constructor injection).
 */
export interface PluginContext {
  logger: PluginLogger;
  /** Plugin tarafindan dogrulanacak ham konfigürasyon degerleri */
  config: Record<string, unknown>;
  /** Plugin dosyalarinin bulundugu dizin (runtime pluginleri icin anlamli) */
  pluginDir: string;
  state: IPluginStateStore;
}

/**
 * PluginContext uretir — hem integration hem management servislerinde kullanilir.
 */
export class PluginContextFactory {
  constructor(
    private readonly configSource: PluginConfigSource,
    private readonly stateDir: string,
  ) {}

  async create(pluginName: string, pluginDir: string): Promise<PluginContext> {
    await mkdir(this.stateDir, { recursive: true });
    const config = await this.configSource.raw(pluginName);
    return {
      logger: new ConsolePluginLogger(pluginName),
      config,
      pluginDir,
      state: new FilePluginStateStore(join(this.stateDir, `${pluginName}.json`)),
    };
  }
}
