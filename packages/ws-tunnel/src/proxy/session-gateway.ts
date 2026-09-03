import { randomUUID } from "node:crypto";

import { Result, ConflictError, ForbiddenError, TransientError, FatalError } from "@gd-monorepo/result";
import type { DomainError } from "@gd-monorepo/result";
import type { ILogger } from "../logger";
import type { IFieldChannel } from "../channel";
import type { IAuditSink } from "../audit";
import type { TunnelRole, TunnelUser } from "../types";
import type { OpenSessionAckMessage, SessionEndMessage } from "../protocol";

import { FieldSessionStore } from "./field-session-store";
import type { FieldSession } from "./field-session-store";

/** Gateway yapılandırması — opsiyonel alanlar testlerde enjekte edilir. */
export interface ContainerSessionGatewayConfig {
  /** open-session ack bekleme süresi (ms). */
  ackTimeoutMs?: number;
  /** Konteyner başına azami eşzamanlı oturum (tasarım §5.6: 1). */
  maxSessionsPerContainer?: number;
  /** Sweep aralığı (ms) — TTL/idle sonlandırma. */
  sweepIntervalMs?: number;
  /** Zaman kaynağı — testlerde deterministik. */
  now?: () => number;
}

/** Oturum açma girdisi — route katmanından gelir. */
export interface OpenSessionInput {
  fieldId: string;
  containerId: string;
  user: TunnelUser;
  remoteIp?: string;
}

/** Başarılı oturum açılışı — cookie değeri + geçerlilik süresi. */
export interface OpenSessionOutcome {
  sessionId: string;
  token: string;
  expiresInSec: number;
  containerRole: TunnelRole;
}

const DEFAULT_ACK_TIMEOUT_MS = 5000;
const DEFAULT_MAX_SESSIONS_PER_CONTAINER = 1;
const DEFAULT_SWEEP_INTERVAL_MS = 60 * 1000;

/**
 * Field rolü → konteyner rolü eşlemesi (tasarım §5.5, 2026-08-30 BİREBİR):
 * roller iki uygulamada da aynıdır ve aynen taşınır. Patron'un konteynerde
 * manevra/kullanıcı yasağı konteyner tarafının rbac matrisiyle sağlanır
 * (commands/users yalnız admin+teknik) — eşleme katmanında gizleme YOKTUR.
 */
export function mapFieldRole(role: TunnelRole): TunnelRole {
  return role;
}

/**
 * ContainerSessionGateway — field tarafı oturum yöneticisi (tasarım §5, T3.3).
 *
 * Akış: POST session → RBAC+fieldIds (route'ta) → limit kontrolü → `open-session`
 * frame'i → konteyner kendi secret'iyle JWT üretir → `open-session-ack` →
 * session_audit (fail-closed — K0.5) → cookie (Path-scoped, HttpOnly).
 *
 * Yaşam döngüsü (§5.7): TTL 4 sa / idle 15 dk sweep → `session-end` yayını +
 * audit kapanışı; field restart sonrası bilinen oturumlar açılışta kapatılır.
 */
export class ContainerSessionGateway {
  private readonly ackTimeoutMs: number;
  private readonly maxSessionsPerContainer: number;
  private readonly sweepIntervalMs: number;
  private readonly now: () => number;
  private pendingAcks: Map<string, (ack: OpenSessionAckMessage) => void> = new Map();
  private sweepTimer?: ReturnType<typeof setInterval>;
  private unsubscribe?: () => void;

  // ELEGANT-EXCEPTION: opsiyonel config alanları — üretim varsayılanlarla
  // çalışır, testler enjekte eder (AlertNotifier deseni).
  constructor(
    private readonly channel: IFieldChannel,
    private readonly sessions: FieldSessionStore,
    private readonly audit: IAuditSink,
    private readonly logger: ILogger | undefined,
    config: ContainerSessionGatewayConfig = {},
  ) {
    this.ackTimeoutMs = config.ackTimeoutMs ?? DEFAULT_ACK_TIMEOUT_MS;
    this.maxSessionsPerContainer =
      config.maxSessionsPerContainer ?? DEFAULT_MAX_SESSIONS_PER_CONTAINER;
    this.sweepIntervalMs = config.sweepIntervalMs ?? DEFAULT_SWEEP_INTERVAL_MS;
    this.now = config.now ?? (() => Date.now());
  }

  /** Observer + sweep kurulumu (komut). */
  initialize(): void {
    this.unsubscribe = this.channel.onControlMessage((_containerId, message) => {
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
  sessionByToken(token: string): FieldSession | undefined {
    return this.sessions.byToken(token);
  }

  /** Konteyner başına açık oturumu bulur (sorgu — Faz 5 kapatma akışı). */
  sessionForContainer(containerId: string): FieldSession | undefined {
    for (const session of this.sessions.byIdIterable()) {
      if (session.containerId === containerId) return session;
    }
    return undefined;
  }

  /**
   * Oturum açar (komut — başarısızlık Result ile, beklenen alan hatası):
   * limit aşımı → ConflictError; konteyner bağlı değil → TransientError;
   * guest → ForbiddenError; ack zaman aşımı → TransientError; audit hatası →
   * FatalError (fail-closed — oturum AÇILMAZ).
   */
  async openSession(input: OpenSessionInput): Promise<Result<OpenSessionOutcome, DomainError>> {
    const containerRole = mapFieldRole(input.user.role);
    if (containerRole === undefined) {
      return Result.err(
        new ForbiddenError("session.role-denied", "Bu rol ile oturum acilamaz"),
      );
    }
    if (
      this.sessions.countFor(input.containerId) >= this.maxSessionsPerContainer
    ) {
      // Faz 5: limit doluysa mevcut oturum "replaced" ile kapatılır ve yenisi
      // açılır — kullanıcı çift tıklamada/önceki çökmüş oturumda takılı kalmaz.
      // (session-end yayını + audit kapanışı closeSession içinde.)
      const existing = this.sessionForContainer(input.containerId);
      if (existing) {
        this.closeSession(existing.sessionId, "replaced");
      }
    }
    if (!this.channel.isConnected(input.containerId)) {
      return Result.err(
        new TransientError(
          "session.offline",
          "Konteyner su anda bagli degil",
        ),
      );
    }

    const sessionId = randomUUID();
    const ackPromise = new Promise<OpenSessionAckMessage>((resolve) => {
      this.pendingAcks.set(sessionId, resolve);
    });

    this.channel.sendControl(input.containerId, {
      type: "open-session",
      sessionId,
      user: {
        id: input.user.id,
        username: input.user.username,
        role: containerRole,
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
        new TransientError("session.ack-timeout", "Konteyner oturum istegine yanit vermedi"),
      );
    }

    const session: FieldSession = {
      sessionId,
      containerId: input.containerId,
      token: ack.token,
      user: input.user,
      containerRole,
      createdAt: this.now(),
      lastActivityAt: this.now(),
      bytesIn: 0,
      bytesOut: 0,
    };

    try {
      await this.audit.open({
        fieldId: input.fieldId,
        containerId: input.containerId,
        sessionId,
        username: input.user.username,
        fieldRole: input.user.role,
        containerRole,
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
      containerRole,
    });
  }

  /** Oturumu kapatır (komut) — `session-end` yayını + audit kapanışı. */
  closeSession(sessionId: string, reason: string): void {
    const session = this.sessions.byId(sessionId);
    if (!session) return;
    this.sessions.end(sessionId);
    this.channel.sendControl(session.containerId, {
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
      this.channel.sendControl(session.containerId, {
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
