import type { OpenSessionMessage, OpenSessionAckMessage, SessionEndMessage } from "../protocol";

import type { ILogger } from "../logger";
import type { ITunnelChannel } from "../channel";

import type { ContainerSessionStore } from "./session-store";

/**
 * ContainerSessionServer — konteyner tarafı oturum frame'leri (tasarım §5.7):
 * - `open-session` → kendi JWT_SECRET'iyle konteyner JWT üret + belleğe kaydet →
 *   `open-session-ack {sessionId, token, expiresInSec}`.
 * - `session-end` → kaydı düşür (field iptali / TTL / restart).
 * Field kullanıcısı konteyner DB'sine ASLA yazılmaz — geçici oturumdur.
 */
export class ContainerSessionServer {
  private unsubscribe?: () => void;

  constructor(
    private readonly connector: ITunnelChannel,
    private readonly store: ContainerSessionStore,
    private readonly logger: ILogger | undefined,
  ) {}

  /** Bağlantı kanalının kontrol mesajlarına abone olur (komut). */
  start(): void {
    this.unsubscribe = this.connector.onMessage((message) => {
      const msg = message as { type?: string };
      if (msg.type === "open-session") {
        void this.onOpenSession(message as OpenSessionMessage);
      } else if (msg.type === "session-end") {
        this.store.end((message as SessionEndMessage).sessionId);
      }
    });
  }

  /** Aboneliği kaldırır (komut). */
  stop(): void {
    this.unsubscribe?.();
    this.unsubscribe = undefined;
  }

  private async onOpenSession(msg: OpenSessionMessage): Promise<void> {
    try {
      const { token, expiresInSec } = await this.store.open(msg.sessionId, {
        id: msg.user.id,
        username: msg.user.username,
        role: msg.user.role,
      });
      this.connector.sendControl({
        type: "open-session-ack",
        sessionId: msg.sessionId,
        token,
        expiresInSec,
      } satisfies OpenSessionAckMessage);
    } catch (error) {
      this.logger?.log({
        level: "error",
        category: "security",
        eventCode: "session_open",
        message: "Oturum JWT uretilemedi",
        context: { sessionId: msg.sessionId },
      }).catch(() => {});
      void error;
    }
  }
}
