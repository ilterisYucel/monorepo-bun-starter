import type { PeerConnectionState } from "@gd-monorepo/ws-tunnel";

/** Stale policy yapılandırması. */
export interface PeerConnectionTrackerConfig {
  /** Heartbeat sessizliği eşiği (ms) — aşınca `stale`. */
  staleTimeoutMs: number;
}

interface TrackerEntry {
  status: PeerConnectionState;
  lastSeenAt: number;
}

/**
 * PeerConnectionTracker — peer bağlantı durumu (SAF domain policy'si).
 *
 * WS/timer/HTTP bilmez; zaman ve sweep dışarıdan beslenir (hexagonal):
 * adapter `sweep()`'i periyodik çağırır, `now` enjekte edilir → deterministik test.
 */
export class PeerConnectionTracker {
  private readonly entries = new Map<string, TrackerEntry>();

  constructor(
    private readonly config: PeerConnectionTrackerConfig,
    private readonly now: () => number = () => Date.now(),
  ) {}

  /** Peer bağlandı/kaydoldu. */
  markConnected(peerId: string): void {
    this.entries.set(peerId, { status: "connected", lastSeenAt: this.now() });
  }

  /** Heartbeat — son görülme tazelenir; stale/idle → connected. */
  markHeartbeat(peerId: string): void {
    const entry = this.entries.get(peerId);
    if (!entry) return;
    entry.lastSeenAt = this.now();
    if (entry.status !== "connected" && entry.status !== "error") {
      entry.status = "connected";
    }
  }

  /** WS hatası — durum `error` (kayıt korunur). */
  markError(peerId: string): void {
    const entry = this.entries.get(peerId);
    if (entry) entry.status = "error";
  }

  /** Bağlantı kapandı — kayıt düşer. */
  markClosed(peerId: string): void {
    this.entries.delete(peerId);
  }

  /** Peer durumu (sorgu); bilinmeyen → idle. */
  statusOf(peerId: string): PeerConnectionState {
    return this.entries.get(peerId)?.status ?? "idle";
  }

  /** Bağlı mı (sorgu) — yalnız `connected` erişime açıktır. */
  isConnected(peerId: string): boolean {
    return this.statusOf(peerId) === "connected";
  }

  /** Tüm durumlar (sorgu — keşif görünümü için). */
  snapshot(): ReadonlyMap<string, PeerConnectionState> {
    const out = new Map<string, PeerConnectionState>();
    for (const [peerId, entry] of this.entries) out.set(peerId, entry.status);
    return out;
  }

  /** Periyodik sweep — eşiği aşan `connected` peer'lar `stale` olur (komut). */
  sweep(): void {
    const threshold = this.now() - this.config.staleTimeoutMs;
    for (const entry of this.entries.values()) {
      if (entry.status === "connected" && entry.lastSeenAt <= threshold) {
        entry.status = "stale";
      }
    }
  }
}
