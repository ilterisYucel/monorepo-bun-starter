import type { RedisConnection } from "@gd-monorepo/core";
import type { WebSocket } from "ws";

const RING_BUFFER_PREFIX = "device";
const RING_BUFFER_MAX = 299;

export class RealtimeManager {
  private connections: Map<string, Set<WebSocket>> = new Map();
  private redisClient: ReturnType<RedisConnection["getClient"]>;

  constructor(
    private readonly redis: RedisConnection,
  ) {
    this.redisClient = redis.getClient();
  }

  subscribe(deviceId: string, ws: WebSocket): void {
    if (!this.connections.has(deviceId)) {
      this.connections.set(deviceId, new Set());
    }
    this.connections.get(deviceId)!.add(ws);
    console.log(`[RealtimeManager] Abone eklendi: ${deviceId} (toplam: ${this.connections.get(deviceId)!.size})`);
  }

  unsubscribe(deviceId: string, ws: WebSocket): void {
    const subscribers = this.connections.get(deviceId);
    if (subscribers) {
      subscribers.delete(ws);
      if (subscribers.size === 0) {
        this.connections.delete(deviceId);
      }
      console.log(`[RealtimeManager] Abone cikti: ${deviceId}`);
    }
  }

  unsubscribeAll(ws: WebSocket): void {
    this.connections.forEach((subscribers, deviceId) => {
      if (subscribers.delete(ws) && subscribers.size === 0) {
        this.connections.delete(deviceId);
      }
    });
  }

  broadcast(deviceId: string, data: unknown): void {
    const subscribers = this.connections.get(deviceId);
    if (!subscribers || subscribers.size === 0) return;

    const message = JSON.stringify(data);
    subscribers.forEach((ws) => {
      if (ws.readyState === ws.OPEN) {
        ws.send(message);
      }
    });
  }

  async writeToRingBuffer(deviceId: string, data: unknown): Promise<void> {
    const key = `${RING_BUFFER_PREFIX}:${deviceId}:buffer`;
    const serialized = typeof data === "string" ? data : JSON.stringify(data);

    await this.redisClient.lPush(key, serialized);
    await this.redisClient.lTrim(key, 0, RING_BUFFER_MAX);
    await this.redisClient.expire(key, 300);
  }

  async ringBuffer(deviceId: string): Promise<unknown[]> {
    const key = `${RING_BUFFER_PREFIX}:${deviceId}:buffer`;
    const items = await this.redisClient.lRange(key, 0, -1);
    return items.map((item) => {
      try {
        return JSON.parse(item);
      } catch {
        return item;
      }
    });
  }

  async sendInitialData(deviceId: string, ws: WebSocket): Promise<void> {
    const buffer = await this.ringBuffer(deviceId);
    if (buffer.length > 0 && ws.readyState === ws.OPEN) {
      ws.send(
        JSON.stringify({
          type: "initial",
          deviceId,
          data: buffer,
        }),
      );
    }
  }

  subscriberCount(deviceId?: string): number {
    if (deviceId) {
      return this.connections.get(deviceId)?.size ?? 0;
    }

    let total = 0;
    this.connections.forEach((subs) => {
      total += subs.size;
    });
    return total;
  }
}
