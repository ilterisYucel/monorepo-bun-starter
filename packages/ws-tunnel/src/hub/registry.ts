import { ValidationError } from "@gd-monorepo/result";
import type { ServiceAnnouncement, TunnelPeerType } from "../protocol";

/**
 * Kayıtlı peer'ın hub görünümü — SAF kayıt (opak servis listesi).
 *
 * `services` yalnızca `id`+`meta` taşır; hedef adres/protokol/endpoint YOKTUR
 * (opaklık ilkesi — WS-TUNNEL-OPAK-SERVIS-ERISIMI §K1).
 */
export interface HubPeerRecord {
  readonly peerId: string;
  readonly peerType: TunnelPeerType;
  readonly services: readonly ServiceAnnouncement[];
}

/** `register` girdisi — saf kayıt anahtarları. */
export interface RegisterPeerInput {
  readonly peerId: string;
  readonly peerType: TunnelPeerType;
  readonly services?: readonly ServiceAnnouncement[];
}

/**
 * HubPeerRegistry — hub tarafı peer + OPAK servis kaydı (**SAF**).
 *
 * Yalnızca bellek-içi veri tutar: WS/timer/HTTP/persistence bağımlılığı
 * YOKTUR (DI kuralı). Taşıma (`FieldRegistry`: WS + token + stale) ve
 * kalıcılık tüketicide yaşar; Faz 3 hub-servis ayrımında bu sınıf routes ile
 * birlikte taşınır.
 *
 * Komutlar (`void`): `register` (ekle/değiştir), `updateServices`,
 * `unregister`. Sorgular: `peers`, `servicesOf`, `isConnected`.
 */
export class HubPeerRegistry {
  private readonly records = new Map<string, HubPeerRecord>();

  /** Peer'ı kaydeder/değiştirir — servis listesi yenisiyle DEĞİŞİR (birleşmez). */
  register(input: RegisterPeerInput): void {
    if (input.peerId.trim().length === 0) {
      throw new ValidationError(
        "hub-peer-registry.no-peer-id",
        "peerId bos olamaz",
      );
    }
    this.records.set(input.peerId, {
      peerId: input.peerId,
      peerType: input.peerType,
      services: dedupeById(input.services ?? []),
    });
  }

  /** Kayıtlı peer'ın servis listesini değiştirir; kayıt yoksa sessiz no-op. */
  updateServices(
    peerId: string,
    services: readonly ServiceAnnouncement[],
  ): void {
    const existing = this.records.get(peerId);
    if (!existing) return;
    this.records.set(peerId, {
      ...existing,
      services: dedupeById(services),
    });
  }

  /** Peer kaydını düşürür; yoksa sessiz no-op (idempotent). */
  unregister(peerId: string): void {
    this.records.delete(peerId);
  }

  /** Kayıtlı tüm peer'lar (kayıt sırasında). */
  peers(): readonly HubPeerRecord[] {
    return [...this.records.values()];
  }

  /** Peer'ın duyurduğu servisler; kayıt yoksa boş dizi. */
  servicesOf(peerId: string): readonly ServiceAnnouncement[] {
    return this.records.get(peerId)?.services ?? [];
  }

  /** Peer kayıtlı mı (register ile true, unregister ile false). */
  isConnected(peerId: string): boolean {
    return this.records.has(peerId);
  }
}

/** Aynı `id` birden fazla gelirse son değer kazanır (idempotent). */
function dedupeById(
  services: readonly ServiceAnnouncement[],
): ServiceAnnouncement[] {
  const byId = new Map<string, ServiceAnnouncement>();
  for (const service of services) {
    byId.set(service.id, service);
  }
  return [...byId.values()];
}
