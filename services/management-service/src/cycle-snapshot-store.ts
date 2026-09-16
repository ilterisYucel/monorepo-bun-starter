// CycleSnapshotStore — tüm cihazların EN GÜNCEL telemetri değerlerini
// biriktiren, TTL bayatlamalı snapshot deposu.
// Kaynak tasarım: docs/architecture/MANAGEMENT-SERVICE-MIMARISI.md §4.

import type { TelemetryData } from "@gd-monorepo/shared-types";

/** Tek ölçümün snapshot'taki temsili — değer + kayıt zamanı. */
export interface SnapshotValue {
  value: number | boolean | string;
  unit: string;
  recordedAt: number;
}

/** Tek cihazın değerleri — ad indeksi + canonical etiket indeksi. */
class DeviceValues {
  readonly byName = new Map<string, SnapshotValue>();
  readonly byCanonical = new Map<string, SnapshotValue>();
}

/**
 * CycleSnapshot — snapshot() çağrısının ANLIK görüntüsü (immutable).
 * Sonraki record'lar dönen nesneyi etkilemez.
 */
export class CycleSnapshot {
  constructor(private readonly devices: ReadonlyMap<string, DeviceValues>) {}

  /** Değer taşıyan (bayat olmayan) cihaz kimlikleri. */
  deviceIds(): string[] {
    return Array.from(this.devices.keys());
  }

  /**
   * Sorgu — cihazdaki telemetri değeri. Önce AD ile bakar; bulunamazsa
   * `tags.canonical` indeksine düşer (ör. key "soc" → "BSC SOC" girişi).
   * Yoksa undefined.
   */
  value(deviceId: string, key: string): SnapshotValue | undefined {
    const device = this.devices.get(deviceId);
    if (!device) return undefined;
    return device.byName.get(key) ?? device.byCanonical.get(key);
  }
}

/** CycleSnapshotStore yapılandırması — tek obje (DI kuralı 3). */
export interface CycleSnapshotStoreConfig {
  /** Bir değerin bayat sayılma eşiği (ms). */
  maxAgeMs: number;
  /** Zaman kaynağı — deterministik test için enjekte edilir. */
  now?: () => number;
}

/**
 * CycleSnapshotStore — `MANAGEMENT` job'larının tüketicisi.
 *
 * Davranış sözleşmesi (test: cycle-snapshot-store.test.ts):
 * - `record()` yalnızca kendi durumunu günceller; aynı anahtar yeni kayıtla
 *   EZİLİR (en yeni değer kuralı).
 * - `snapshot()` bayat girişleri (recordedAt > now - maxAgeMs DEĞİLSE) hem
 *   çıktıdan hem depodan çıkarır — sessiz cihaz değerlendirmede yok sayılır
 *   (kademeli bozulma).
 * - canonical etiketi taşıyan girişler `value(deviceId, canonicalKey)` ile
 *   erişilebilir.
 */
export class CycleSnapshotStore {
  private readonly devices = new Map<string, DeviceValues>();
  private readonly maxAgeMs: number;
  private readonly now: () => number;

  constructor(config: CycleSnapshotStoreConfig) {
    this.maxAgeMs = config.maxAgeMs;
    this.now = config.now ?? (() => Date.now());
  }

  /** Komut — bir cihazın telemetri setini kaydeder (eskileri ezer). */
  record(deviceId: string, telemetries: TelemetryData[]): void {
    let device = this.devices.get(deviceId);
    if (!device) {
      device = new DeviceValues();
      this.devices.set(deviceId, device);
    }
    const now = this.now();
    for (const t of telemetries) {
      const entry: SnapshotValue = {
        value: t.value,
        unit: t.unit,
        recordedAt: now,
      };
      device.byName.set(t.name, entry);
      const canonical = t.tags?.canonical;
      if (canonical !== undefined && canonical.length > 0) {
        device.byCanonical.set(canonical, entry);
      }
    }
  }

  /** Sorgu — bayat girişleri temizleyip anlık görüntü döner (derin kopya). */
  snapshot(): CycleSnapshot {
    const now = this.now();
    for (const [deviceId, device] of this.devices) {
      for (const [name, entry] of device.byName) {
        if (now - entry.recordedAt > this.maxAgeMs) {
          device.byName.delete(name);
        }
      }
      for (const [canonical, entry] of device.byCanonical) {
        if (now - entry.recordedAt > this.maxAgeMs) {
          device.byCanonical.delete(canonical);
        }
      }
      if (device.byName.size === 0) {
        this.devices.delete(deviceId);
      }
    }

    const copy = new Map<string, DeviceValues>();
    for (const [deviceId, device] of this.devices) {
      const deviceCopy = new DeviceValues();
      for (const [name, entry] of device.byName) {
        deviceCopy.byName.set(name, { ...entry });
      }
      for (const [canonical, entry] of device.byCanonical) {
        deviceCopy.byCanonical.set(canonical, { ...entry });
      }
      copy.set(deviceId, deviceCopy);
    }
    return new CycleSnapshot(copy);
  }
}
