// DeviceCatalog — kural `device` seçicilerini somut cihaz kimliklerine
// çözümleyen katalog. Kaynak tasarım: MANAGEMENT-SERVICE-MIMARISI.md §5.

import type { RuleDeviceSelector } from "@gd-monorepo/shared-types";

/** Katalog girdisi — device config'ten türetilir. */
export interface DeviceCatalogEntry {
  deviceId: string;
  type?: string;
}

/**
 * DeviceCatalog — (deviceId, type) girdileri üzerinden hedef set çözümler.
 *
 * Sözleşme (test: device-catalog.test.ts):
 * - Seçici yoksa TÜM cihazlar döner.
 * - `ids` ∪ `types` BİRLEŞİM; çift kayıt yok, sıra korunur.
 * - `types` eşleşmesi birebir string eşitliktir; bilinmeyen tip boş katkı.
 * - Bilinmeyen id sessizce yok sayılır.
 * - Yan etki YOK.
 */
export class DeviceCatalog {
  private readonly entries: readonly DeviceCatalogEntry[];

  constructor(entries: readonly DeviceCatalogEntry[]) {
    this.entries = [...entries];
  }

  /** Sorgu — seçiciyi somut cihaz kimlikleri listesine çözer. */
  resolveTargets(selector?: RuleDeviceSelector): string[] {
    const targets: string[] = [];
    const seen = new Set<string>();

    const add = (deviceId: string): void => {
      if (!seen.has(deviceId)) {
        seen.add(deviceId);
        targets.push(deviceId);
      }
    };

    if (!selector) {
      for (const entry of this.entries) add(entry.deviceId);
      return targets;
    }

    for (const id of selector.ids ?? []) {
      if (this.entries.some((e) => e.deviceId === id)) add(id);
    }
    for (const type of selector.types ?? []) {
      for (const entry of this.entries) {
        if (entry.type === type) add(entry.deviceId);
      }
    }
    return targets;
  }
}
