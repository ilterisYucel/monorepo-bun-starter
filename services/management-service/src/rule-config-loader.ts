// RuleConfigLoader — rules.json + device config dizininden kural dosyası ve
// cihaz kataloğu üreten yükleyici.
// Kaynak tasarım: docs/architecture/MANAGEMENT-SERVICE-MIMARISI.md §5, §8.

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { ValidationError } from "@gd-monorepo/result";
import {
  automationRulesSchema,
  validateOrThrow,
} from "@gd-monorepo/shared-types";
import type { AutomationRulesFile } from "@gd-monorepo/shared-types";
import { DeviceCatalog } from "./device-catalog";
import type { DeviceCatalogEntry } from "./device-catalog";

/** RuleConfigLoader yapılandırması — tek obje (DI kuralı 3). */
export interface RuleConfigLoaderConfig {
  rulesPath: string;
  deviceConfigDir: string;
}

/**
 * RuleConfigLoader — kural kaynağı.
 *
 * Davranış sözleşmesi (test: rule-config-loader.test.ts, MIMARISI §8):
 * - `loadRules()`: dosya yok / bozuk JSON / şema reddi → ValidationError
 *   THROW (fail-fast — servis yanlış kural dosyasıyla AÇILMAZ). Şema
 *   STRICT'tir: bilinmeyen anahtar reddedilir.
 * - `loadCatalog()`: device config dizinindeki *.json dosyalarından
 *   (deviceId, type) girdileri üretir; bozuk dosya atlanır (best-effort),
 *   dizin yoksa boş katalog.
 * - Yan etki YOK.
 */
export class RuleConfigLoader {
  private readonly rulesPath: string;
  private readonly deviceConfigDir: string;

  constructor(config: RuleConfigLoaderConfig) {
    this.rulesPath = config.rulesPath;
    this.deviceConfigDir = config.deviceConfigDir;
  }

  /** Sorgu — kuralları yükler + doğrular; geçersiz → throw (fail-fast). */
  loadRules(): AutomationRulesFile {
    if (!existsSync(this.rulesPath)) {
      throw new ValidationError(
        "management.rules-missing",
        `Kural dosyasi bulunamadi: ${this.rulesPath}`,
      );
    }
    let raw: unknown;
    try {
      raw = JSON.parse(readFileSync(this.rulesPath, "utf-8"));
    } catch (err) {
      throw new ValidationError(
        "management.rules-invalid",
        `Kural dosyasi okunamadi: ${String(err)}`,
      );
    }
    return validateOrThrow<AutomationRulesFile>(
      automationRulesSchema,
      raw,
      "management rules",
    );
  }

  /** Sorgu — cihaz config dizininden katalog üretir. */
  loadCatalog(): DeviceCatalog {
    const entries: DeviceCatalogEntry[] = [];
    if (!existsSync(this.deviceConfigDir)) {
      return new DeviceCatalog([]);
    }

    const files = readdirSync(this.deviceConfigDir).filter((f) =>
      f.endsWith(".json"),
    );
    for (const file of files) {
      try {
        const parsed = JSON.parse(
          readFileSync(join(this.deviceConfigDir, file), "utf-8"),
        ) as { deviceId?: unknown; type?: unknown };
        if (typeof parsed.deviceId === "string" && parsed.deviceId.length > 0) {
          entries.push({
            deviceId: parsed.deviceId,
            ...(typeof parsed.type === "string" ? { type: parsed.type } : undefined),
          });
        }
      } catch {
        // best-effort — bozuk cihaz dosyası kataloğu durdurmaz
      }
    }
    return new DeviceCatalog(entries);
  }
}
