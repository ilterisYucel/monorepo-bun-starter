import type { TunnelRole } from "../types";
import type { ITokenSigner } from "../token";

/** Client oturum kullanıcısı — rol, HUB tarafında eşlenmiştir (tasarım §5.5). */
export interface ClientSessionUser {
  id: string;
  username: string;
  /** Client rolü — 2026-08-30: BİREBİR eşleme (hub rolü aynen taşınır). */
  role: TunnelRole;
}

/** Bellekteki oturum kaydı. */
export interface ClientSession {
  sessionId: string;
  user: ClientSessionUser;
  createdAt: number;
  lastActivityAt: number;
}

/** ClientSessionStore yapılandırması — opsiyonel alanlar testlerde enjekte edilir. */
export interface ClientSessionStoreConfig {
  /** Oturum ömrü (sn) — varsayılan 4 saat (tasarım §5.6). */
  ttlSec?: number;
  /** Boşta kalma süresi (sn) — varsayılan 15 dk (tasarım §5.6). */
  idleTimeoutSec?: number;
  /** Zaman kaynağı — testlerde deterministik. */
  now?: () => number;
}

const DEFAULT_TTL_SEC = 4 * 60 * 60;
const DEFAULT_IDLE_TIMEOUT_SEC = 15 * 60;

/**
 * ClientSessionStore — client tarafı geçici oturum deposu (tasarım §5.7).
 * Kullanıcılar client DB'sine ASLA yazılmaz; uzak operatör = geçici oturum.
 * `sweep()` TTL + idle süresi dolan oturumları kapatır (orphan temizliği —
 * kırılganlık #3); hub `session-end` frame'i `end()`'e bağlanır.
 */
export class ClientSessionStore {
  private sessions: Map<string, ClientSession> = new Map();
  private readonly ttlSec: number;
  private readonly idleTimeoutSec: number;
  private readonly tokenTtlSec: number;
  private readonly now: () => number;

  // ELEGANT-EXCEPTION: opsiyonel config alanları — üretim kodu varsayılanlarla
  // çalışır, testler enjekte eder (AlertNotifier deseni, core).
  constructor(
    private readonly tokens: ITokenSigner,
    config: ClientSessionStoreConfig = {},
  ) {
    this.ttlSec = config.ttlSec ?? DEFAULT_TTL_SEC;
    this.idleTimeoutSec = config.idleTimeoutSec ?? DEFAULT_IDLE_TIMEOUT_SEC;
    this.tokenTtlSec = this.ttlSec;
    this.now = config.now ?? (() => Date.now());
  }

  /**
   * Yeni oturum açar (komut) — imzalı client JWT'si + geçerlilik süresi döner.
   */
  async open(
    sessionId: string,
    user: ClientSessionUser,
  ): Promise<{ token: string; expiresInSec: number }> {
    const ts = this.now();
    const session: ClientSession = {
      sessionId,
      user,
      createdAt: ts,
      lastActivityAt: ts,
    };
    this.sessions.set(sessionId, session);
    const token = await this.tokens.sign(
      {
        sessionId,
        sub: user.id,
        username: user.username,
        role: user.role,
      },
      this.tokenTtlSec,
    );
    return { token, expiresInSec: this.tokenTtlSec };
  }

  /**
   * Token'ı doğrular (sorgu). Geçerliyse kullanıcıyı döner ve liveness saatini
   * tazeler (idle timeout'unun kaynağı — dokümante yan etki); geçersizse undefined.
   */
  async authenticate(token: string): Promise<ClientSessionUser | undefined> {
    const payload = await this.tokens.verify(token);
    if (!payload) return undefined;
    const session = this.sessions.get(payload.sessionId);
    if (!session) return undefined;
    session.lastActivityAt = this.now();
    return session.user;
  }

  /** Oturumu iptal eder (komut) — `session-end` frame'inin karşılığı. */
  end(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  /** TTL ve idle süresi dolan oturumları kapatır (komut). */
  sweep(): void {
    const ts = this.now();
    this.sessions.forEach((session, sessionId) => {
      const ageMs = (ts - session.createdAt) / 1000;
      const idleMs = (ts - session.lastActivityAt) / 1000;
      if (ageMs >= this.ttlSec || idleMs >= this.idleTimeoutSec) {
        this.sessions.delete(sessionId);
      }
    });
  }

  /** Açık oturum sayısı (sorgu). */
  activeCount(): number {
    return this.sessions.size;
  }
}
