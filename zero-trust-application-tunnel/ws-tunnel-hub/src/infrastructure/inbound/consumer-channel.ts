import type { WebSocket } from "ws";
import type { IConsumerRelay } from "../../domain/ports/consumer-relay";

/**
 * ConsumerChannel — `/ws/consumer` adapter'ı (IConsumerRelay uygulaması).
 *
 * Peer'dan gelen opak kontrol mesajlarını `{ peerId, message }` zarfıyla
 * bağlı tüketicilere iletir. Hub mesajı yorumlamaz.
 */
export class ConsumerChannel implements IConsumerRelay {
  private readonly sockets = new Set<WebSocket>();

  add(socket: WebSocket): void {
    this.sockets.add(socket);
    socket.on("close", () => this.sockets.delete(socket));
    socket.on("error", () => this.sockets.delete(socket));
  }

  publish(peerId: string, message: unknown): void {
    const payload = JSON.stringify({ peerId, message });
    for (const socket of this.sockets) {
      if (socket.readyState === 1) socket.send(payload);
    }
  }

  closeAll(): void {
    for (const socket of this.sockets) {
      try {
        socket.close(1001, "server-stopping");
      } catch {
        // yok say
      }
    }
    this.sockets.clear();
  }

  size(): number {
    return this.sockets.size;
  }
}
