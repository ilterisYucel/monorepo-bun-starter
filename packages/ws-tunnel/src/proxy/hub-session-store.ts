import type { TunnelRole, TunnelUser } from "../types";

/** Hub tarafı oturum kaydı — cookie (client JWT) ile eşlenir. */
export interface HubSession {
  sessionId: string;
  peerId: string;
  /** Client JWT'si — cookie değeri (hub içeriğini görmez — §5.4). */
  token: string;
  /** Hub kullanıcısı (site erişimleriyle). */
  user: TunnelUser;
  /** Eşlenmiş client rolü (§5.5). */
  peerRole: TunnelRole;
  createdAt: number;
  lastActivityAt: number;
  bytesIn: number;
  bytesOut: number;
}

/** HubSessionStore yapılandırması — opsiyonel alanlar testlerde enjekte edilir. */
export interface HubSessionStoreConfig {
  /** Oturum ömrü (ms) — varsayılan 4 saat (§5.6). */
  ttlMs?: number;
  /** Boşta kalma süresi (ms) — varsayılan 15 dk (§5.6). */
  idleTimeoutMs?: number;
  /** Zaman kaynağı — testlerde deterministik. */
  now?: () => number;
}

const DEFAULT_TTL_MS = 4 * 60 * 60 * 1000;
const DEFAULT_IDLE_TIMEOUT_MS = 15 * 60 * 1000;

/**
 * HubSessionStore — hub tarafı oturum kayıtları (tasarım §5.7).
 * Cookie → oturum eşlemesi burada tutulur; `sweep()` TTL/idle süresi dolan
 * oturumları kapatır. Client tarafı periyodik TTL sweep'iyle birlikte
 * orphan session temizliği sağlanır (kırılganlık #3).
 */
export class HubSessionStore {
  private sessions: Map<string, HubSession> = new Map();
  private readonly ttlMs: number;
  private readonly idleTimeoutMs: number;
  private readonly now: () => number;

  // ELEGANT-EXCEPTION: opsiyonel config alanları — üretim varsayılanlarla
  // çalışır, testler enjekte eder (AlertNotifier deseni).
  constructor(config: HubSessionStoreConfig = {}) {
    this.ttlMs = config.ttlMs ?? DEFAULT_TTL_MS;
    this.idleTimeoutMs = config.idleTimeoutMs ?? DEFAULT_IDLE_TIMEOUT_MS;
    this.now = config.now ?? (() => Date.now());
  }

  /** Oturumu kaydeder (komut) — token → oturum eşlemesi. */
  register(session: HubSession): void {
    this.sessions.set(session.sessionId, session);
  }

  /** Cookie değeriyle oturumu bulur (sorgu — liveness saatini tazeler). */
  byToken(token: string): HubSession | undefined {
    for (const session of this.sessions.values()) {
      if (session.token === token) {
        session.lastActivityAt = this.now();
        return session;
      }
    }
    return undefined;
  }

  /** sessionId ile oturumu bulur (sorgu). */
  byId(sessionId: string): HubSession | undefined {
    return this.sessions.get(sessionId);
  }

  /** Tüm açık oturumlar üzerinde gezinme (sorgu). */
  byIdIterable(): IterableIterator<HubSession> {
    return this.sessions.values();
  }

  /** Oturumu kapatır (komut). */
  end(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  /** Peer başına açık oturum sayısı (sorgu) — limit kontrolü (§5.6). */
  countFor(peerId: string): number {
    let count = 0;
    for (const session of this.sessions.values()) {
      if (session.peerId === peerId) count += 1;
    }
    return count;
  }

  /** TTL/idle süresi dolan oturumları düşürür (komut) — sona erenleri döner. */
  sweep(): HubSession[] {
    const now = this.now();
    const expired: HubSession[] = [];
    this.sessions.forEach((session, sessionId) => {
      if (
        now - session.createdAt >= this.ttlMs ||
        now - session.lastActivityAt >= this.idleTimeoutMs
      ) {
        this.sessions.delete(sessionId);
        expired.push(session);
      }
    });
    return expired;
  }

  /** Açık oturum sayısı (sorgu). */
  activeCount(): number {
    return this.sessions.size;
  }
}
