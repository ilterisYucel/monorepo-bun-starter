// DeviceRegistryTargets — OperationExecutor hedef çözümleyici adaptörü.
// Kaynak tasarım: KOMUT-MANEVRA-OPERASYON §5.1 (RealtimeSnapshotSource deseni:
// devices tablosu `status='online'` — DeviceRegistry önbelleği).

import type { ICommandTargetResolver } from "@gd-monorepo/platform-commands";
import type { DeviceRegistry } from "../persistence/device-registry";

/**
 * DeviceRegistryTargets — seçici çözümleme (§5.1):
 *
 * - `resolveAvailable(type)`: online cihazlardan `type` eşleşenler.
 * - `filterAvailable(ids)`: açık listeden yalnızca online olanlar.
 *
 * NOT (§5.1 filtre kapsamı): "unavailable/fault/bakım hariç" — devices
 * tablosunda bu ayrım sütunu henüz yok; filtre bugün `status='online'`'dır
 * (RealtimeSnapshotSource sözleşmesinin birebir aynısı). Müsaitlik sütunu
 * gelince bu adaptör genişler — yürütücü kodu DEĞİŞMEZ.
 */
export class DeviceRegistryTargets implements ICommandTargetResolver {
  constructor(private readonly registry: DeviceRegistry) {}

  /** Sorgu — tipteki online cihaz kimlikleri. */
  async resolveAvailable(type: string): Promise<string[]> {
    return this.registry
      .online()
      .filter((d) => d.type === type)
      .map((d) => d.id);
  }

  /** Sorgu — listeden online olanlar (sıra korunur). */
  async filterAvailable(ids: string[]): Promise<string[]> {
    const online = new Set(this.registry.online().map((d) => d.id));
    return ids.filter((id) => online.has(id));
  }
}
