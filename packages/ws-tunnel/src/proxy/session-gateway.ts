import { randomUUID } from "node:crypto";

import { Result, ConflictError, ForbiddenError, TransientError, FatalError } from "@gd-monorepo/result";
import type { DomainError } from "@gd-monorepo/result";
import type { ILogger } from "../logger";
import type { IHubChannel } from "../channel";
import type { IAuditSink } from "../audit";
import type { TunnelRole, TunnelUser } from "../types";
import type { OpenSessionAckMessage, SessionEndMessage } from "../protocol";

import { HubSessionStore } from "./hub-session-store";
import type { HubSession } from "./hub-session-store";

/** Gateway yapılandırması — opsiyonel alanlar testlerde enjekte edilir. */
export interface SessionGatewayConfig {
  /** open-session ack bekleme süresi (ms). */
  ackTimeoutMs?: number;
  /** Peer başına azami eşzamanlı oturum (tasarım §5.6: 1). */
  maxSessionsPerPeer?: number;
  /** Sweep aralığı (ms) — TTL/idle sonlandırma. */
  sweepIntervalMs?: number;
  /** Zaman kaynağı — testlerde deterministik. */
  now?: () => number;
}

/** Oturum açma girdisi — route katmanından gelir. */
export interface OpenSessionInput {
  /** Hub site kimliği (deployment-bazlı anlam: container hub'da fieldId, boss hub'da fieldId). */
  fieldId: string;
  peerId: string;
  user: TunnelUser;
  remoteIp?: string;
}

/** Başarılı oturum açılışı — cookie değeri + geçerlilik süresi. */
export interface OpenSessionOutcome {
  sessionId: string;
  token: string;
  expiresInSec: number;
  peerRole: TunnelRole;
}

const DEFAULT_ACK_TIMEOUT_MS = 5000;
const DEFAULT_MAX_SESSIONS_PER_PEER = 1;
const DEFAULT_SWEEP_INTERVAL_MS = 60 * 1000;

/**
 * Hub rolü → client rolü eşlemesi (tasarım §5.5, 2026-08-30 BİREBİR):
 * roller iki uygulamada da aynıdır ve aynen taşınır. Patron'un client'te
 * manevra/kullanıcı yasağı client tarafının rbac matrisiyle sağlanır
 * (commands/users yalnız admin+teknik) — eşleme katmanında gizleme YOKTUR.
 */
export function mapSessionRole(role: TunnelRole): TunnelRole {
  return role;
}

/**
 * SessionGateway — hub tarafı oturum yöneticisi (tasarım §5, T3.3).
 *
 * Akış: POST session → RBAC+site yetkisi (route'ta) → limit kontrolü → `open-session`
 * frame'i → client kendi secret'iyle JWT üretir → `open-session-ack` →
 * session_audit (fail-closed — K0.5) → cookie (Path-scoped, HttpOnly).
 *
 * Yaşam döngüsü (§5.7): TTL 4 sa / idle 15 dk sweep → `session-end` yayını +
 * audit kapanışı; hub restart sonrası bilinen oturumlar açılışta kapatılır.
 */
export class SessionGateway {
  private readonly ackTimeoutMs: number;
  private readonly maxSessionsPerPeer: number;
  private readonly sweepIntervalMs: number;
  private readonly now: () => number;
  private pendingAcks: Map<string, (ack: OpenSessionAckMessage) => void> = new Map();
  private sweepTimer?: ReturnType<typeof setInterval>;
  private unsubscribe?: () => void;

  // ELEGANT-EXCEPTION: opsiyonel config alanları — üretim varsayılanlarla
  // çalışır, testler enjekte eder (AlertNotifier deseni).
  constructor(
    private readonly channel: IHubChannel,
    private readonly sessions: HubSessionStore,
    private readonly audit: IAuditSink,
    private readonly logger: ILogger | undefined,
    config: SessionGatewayConfig = {},
  ) {
    this.ackTimeoutMs = config.ackTimeoutMs ?? DEFAULT_ACK_TIMEOUT_MS;
    this.maxSessionsPerPeer =
      config.maxSessionsPerPeer ?? DEFAULT_MAX_SESSIONS_PER_PEER;
    this.sweepIntervalMs = config.sweepIntervalMs ?? DEFAULT_SWEEP_INTERVAL_MS;
    this.now = config.now ?? (() => Date.now());
  }

  /** Observer + sweep kurulumu (komut). */
  initialize(): void {
    this.unsubscribe = this.channel.onControlMessage((_peerId, message) => {
      const msg = message as { type?: string };
      if (msg.type === "open-session-ack") {
        const ack = message as OpenSessionAckMessage;
        const resolve = this.pendingAcks.get(ack.sessionId);
        if (resolve) {
          this.pendingAcks.delete(ack.sessionId);
          resolve(ack);
        }
      }
    });
    this.sweepTimer = setInterval(() => void this.sweep(), this.sweepIntervalMs);
  }

  /** Observer + sweep kapatma (komut). */
  stop(): void {
    if (this.sweepTimer) clearInterval(this.sweepTimer);
    this.sweepTimer = undefined;
    this.unsubscribe?.();
    this.unsubscribe = undefined;
  }

  /** Cookie değeriyle oturumu bulur (sorgu). */
  sessionByToken(token: string): HubSession | undefined {
    return this.sessions.byToken(token);
  }

  /** Peer başına açık oturumu bulur (sorgu — Faz 5 kapatma akışı). */
  sessionForPeer(peerId: string): HubSession | undefined {
    for (const session of this.sessions.byIdIterable()) {
      if (session.peerId === peerId) return session;
    }
    return undefined;
  }

  /**
   * Oturum açar (komut — başarısızlık Result ile, beklenen alan hatası):
   * limit aşımı → ConflictError; client bağlı değil → TransientError;
   * guest → ForbiddenError; ack zaman aşımı → TransientError; audit hatası →
   * FatalError (fail-closed — oturum AÇILMAZ).
   */
  async openSession(input: OpenSessionInput): Promise<Result<OpenSessionOutcome, DomainError>> {
    const peerRole = mapSessionRole(input.user.role);
    if (peerRole === undefined) {
      return Result.err(
        new ForbiddenError("session.role-denied", "Bu rol ile oturum acilamaz"),
      );
    }
    if (
      this.sessions.countFor(input.peerId) >= this.maxSessionsPerPeer
    ) {
      // Faz 5: limit doluysa mevcut oturum "replaced" ile kapatılır ve yenisi
      // açılır — kullanıcı çift tıklamada/önceki çökmüş oturumda takılı kalmaz.
      // (session-end yayını + audit kapanışı closeSession içinde.)
      const existing = this.sessionForPeer(input.peerId);
      if (existing) {
        this.closeSession(existing.sessionId, "replaced");
      }
    }
    if (!this.channel.isConnected(input.peerId)) {
      return Result.err(
        new TransientError(
          "session.offline",
          "Client su anda bagli degil",
        ),
      );
    }

    const sessionId = randomUUID();
    const ackPromise = new Promise<OpenSessionAckMessage>((resolve) => {
      this.pendingAcks.set(sessionId, resolve);
    });

    this.channel.sendControl(input.peerId, {
      type: "open-session",
      sessionId,
      user: {
        id: input.user.id,
        username: input.user.username,
        role: peerRole,
      },
    });

    const ack = await Promise.race([
      ackPromise,
      new Promise<undefined>((resolve) =>
        setTimeout(() => resolve(undefined), this.ackTimeoutMs),
      ),
    ]);
    if (ack === undefined) {
      this.pendingAcks.delete(sessionId);
      return Result.err(
        new TransientError("session.ack-timeout", "Client oturum istegine yanit vermedi"),
      );
    }

    const session: HubSession = {
      sessionId,
      peerId: input.peerId,
      token: ack.token,
      user: input.user,
      peerRole,
      createdAt: this.now(),
      lastActivityAt: this.now(),
      bytesIn: 0,
      bytesOut: 0,
    };

    try {
      await this.audit.open({
        fieldId: input.fieldId,
        peerId: input.peerId,
        sessionId,
        username: input.user.username,
        callerRole: input.user.role,
        peerRole,
        remoteIp: input.remoteIp,
      });
    } catch (error) {
      // fail-closed: audit yazılamazsa oturum kayıt edilmez
      void error;
      return Result.err(
        new FatalError(
          "session.audit-failed",
          "Oturum denetim kaydi yazilamadi — oturum acilmadi",
        ),
      );
    }

    this.sessions.register(session);
    return Result.ok({
      sessionId,
      token: ack.token,
      expiresInSec: ack.expiresInSec,
      peerRole,
    });
  }

  /** Oturumu kapatır (komut) — `session-end` yayını + audit kapanışı. */
  closeSession(sessionId: string, reason: string): void {
    const session = this.sessions.byId(sessionId);
    if (!session) return;
    this.sessions.end(sessionId);
    this.channel.sendControl(session.peerId, {
      type: "session-end",
      sessionId,
      reason,
    } satisfies SessionEndMessage);
    void this.audit
      .close({
        sessionId,
        endReason: reason,
        bytesIn: session.bytesIn,
        bytesOut: session.bytesOut,
      })
      .catch(() => {
        this.logger?.log({
          level: "error",
          category: "security",
          eventCode: "session_end",
          message: "Oturum kapanis audit'i yazilamadi",
          context: { sessionId },
        }).catch(() => {});
      });
  }

  /** TTL/idle süresi dolan oturumları kapatır (komut — sweep). */
  private sweep(): void {
    const expired = this.sessions.sweep();
    for (const session of expired) {
      this.channel.sendControl(session.peerId, {
        type: "session-end",
        sessionId: session.sessionId,
        reason: "expired",
      } satisfies SessionEndMessage);
      void this.audit
        .close({
          sessionId: session.sessionId,
          endReason: "expired",
          bytesIn: session.bytesIn,
          bytesOut: session.bytesOut,
        })
        .catch(() => {});
    }
  }
}
