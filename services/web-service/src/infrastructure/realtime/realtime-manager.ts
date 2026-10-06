import type { RedisConnection } from "@gd-monorepo/core";
import type { WebSocket } from "ws";

const RING_BUFFER_PREFIX = "device";
const RING_BUFFER_MAX = 299;

export class RealtimeManager {
  private connections: Map<string, Set<WebSocket>> = new Map();
  /** socket → deviceId → istenen telemetri isimleri (panel spec filtresi). */
  private socketNames: Map<WebSocket, Map<string, Set<string>>> = new Map();
  private redisClient: ReturnType<RedisConnection["client"]>;
  private sweepInterval?: ReturnType<typeof setInterval>;

  constructor(
    private readonly redis: RedisConnection,
  ) {
    this.redisClient = redis.client();
    this.startSweep();
  }

  private startSweep(): void {
    this.sweepInterval = setInterval(() => {
      this.connections.forEach((subscribers, deviceId) => {
        for (const ws of subscribers) {
          if (ws.readyState === ws.CLOSED || ws.readyState === ws.CLOSING) {
            subscribers.delete(ws);
          }
        }
        if (subscribers.size === 0) {
          this.connections.delete(deviceId);
        }
      });
    }, 60000);
  }

  subscribe(deviceId: string, ws: WebSocket, names?: string[]): void {
    if (!this.connections.has(deviceId)) {
      this.connections.set(deviceId, new Set());
    }
    this.connections.get(deviceId)!.add(ws);

    if (names !== undefined && names.length > 0) {
      let perSocket = this.socketNames.get(ws);
      if (perSocket === undefined) {
        perSocket = new Map();
        this.socketNames.set(ws, perSocket);
      }
      perSocket.set(deviceId, new Set(names));
    }

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
    const perSocket = this.socketNames.get(ws);
    if (perSocket) {
      perSocket.delete(deviceId);
      if (perSocket.size === 0) this.socketNames.delete(ws);
    }
  }

  unsubscribeAll(ws: WebSocket): void {
    this.connections.forEach((subscribers, deviceId) => {
      if (subscribers.delete(ws) && subscribers.size === 0) {
        this.connections.delete(deviceId);
      }
    });
    this.socketNames.delete(ws);
  }

  broadcast(deviceId: string, data: unknown): void {
    const subscribers = this.connections.get(deviceId);
    if (!subscribers || subscribers.size === 0) return;

    subscribers.forEach((ws) => {
      if (ws.readyState !== ws.OPEN) return;
      const filtered = this.filterForSocket(ws, deviceId, data);
      if (filtered === null) return;
      ws.send(JSON.stringify(filtered));
    });
  }

  /**
   * Socket'in isim filtresine göre mesajı süzer. Filtre yoksa mesaj aynen döner;
   * filtre var ama eşleşen satır yoksa `null` (gönderim atlanır).
   */
  private filterForSocket(ws: WebSocket, deviceId: string, data: unknown): unknown | null {
    const names = this.socketNames.get(ws)?.get(deviceId);
    if (names === undefined || names.size === 0) return data;

    const message = data as { type?: string; data?: unknown };
    if (!Array.isArray(message.data)) return data;

    const rows = message.data.filter((row) => {
      const name = (row as { name?: string }).name;
      return name !== undefined && names.has(name);
    });
    if (rows.length === 0) return null;
    return { ...message, data: rows };
  }

  async writeToRingBuffer(deviceId: string, data: unknown): Promise<void> {
    const key = `${RING_BUFFER_PREFIX}:${deviceId}:buffer`;
    const serialized = typeof data === "string" ? data : JSON.stringify(data);

    await this.redisClient.lPush(key, serialized);
    await this.redisClient.lTrim(key, 0, RING_BUFFER_MAX);
    await this.redisClient.expire(key, 300);
  }

  async writeBatchToRingBuffer(deviceId: string, dataList: unknown[]): Promise<void> {
    if (dataList.length === 0) return;
    const key = `${RING_BUFFER_PREFIX}:${deviceId}:buffer`;
    const serialized = dataList.map((d) => typeof d === "string" ? d : JSON.stringify(d));

    await this.redisClient.lPush(key, serialized);
    // Faz 5.1 B1: trim, son partinin TÜM kayıtlarını koruyacak kadar geniş olmalı.
    // RING_BUFFER_MAX'ta kesilince isim sayısı > 299 olan cihazlarda (BSC ≈ 960)
    // listenin başındaki isimler (SOC/voltage/canonical) kayboluyordu — field
    // snapshot'ı canonical'sız kalıp kartlarda yalnızca bağlantı durumu kalıyordu.
    await this.redisClient.lTrim(key, 0, Math.max(RING_BUFFER_MAX, dataList.length));
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
    if (buffer.length === 0 || ws.readyState !== ws.OPEN) return;

    const names = this.socketNames.get(ws)?.get(deviceId);
    const source = names !== undefined && names.size > 0
      ? buffer.filter((row) => {
          const name = (row as { name?: string }).name;
          return name !== undefined && names.has(name);
        })
      : buffer;

    // İstenen isimler için yalnız EN YENİ değeri yolla (snapshot).
    const latest = new Map<string, unknown>();
    for (const row of source) {
      const name = (row as { name?: string }).name;
      if (name === undefined) continue;
      const ts = (row as { timestamp?: string }).timestamp ?? "";
      const prev = latest.get(name) as { timestamp?: string } | undefined;
      if (prev === undefined || Date.parse(ts) >= Date.parse(prev.timestamp ?? "")) {
        latest.set(name, row);
      }
    }
    const data = [...latest.values()];
    if (data.length === 0) return;

    ws.send(JSON.stringify({ type: "initial", deviceId, data }));
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

  close(): void {
    if (this.sweepInterval) {
      clearInterval(this.sweepInterval);
      this.sweepInterval = undefined;
    }
  }
}
