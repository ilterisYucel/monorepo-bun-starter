// packages/core/src/messaging/bullmq-adapter.ts

import { Queue, QueueEvents, Worker, type JobsOptions } from "bullmq";
import type { QueueStatus } from "./interface";
import type { RedisConnection } from "./redis";
import {
  BullMQQueue,
  type RedisConnectionInfo,
} from "./bullmq-queue";

/** `openQueue` çağrısı başına kuyruk açılış seçenekleri. */
export interface OpenQueueOptions {
  /** Kuyruğun varsayılan job seçenekleri (retry politikası vb.). */
  retryOptions?: JobsOptions;
}

/**
 * BullMQAdapter — BullMQ'nun JENERİK sarmalayıcısı (proje-bağımsız).
 *
 * Sözleşme:
 * - Hiçbir sistem/domain kavramı (JobType, kuyruk adları, retry politikaları)
 *   bu sınıfta BULUNMAZ — kuyruklar adla açılır (`openQueue`), sistem
 *   katmanı adları ve politikaları dışarıdan verir.
 * - Kuyruklar LAZY açılır ve önbelleklenir; aynı ad tek Queue örneği döner.
 * - Worker'lar facade üzerinden kurulur ve adapter'da izlenir — `close()`
 *   tümünü toplu kapatır.
 * - `queueStatus()`: açık TÜM kuyrukların sayaçları (name = kuyruk adı).
 * - `health()`: yalnızca redis ping'i (sistem katmanı ek denetimler ekler).
 * - `close()`: tüm worker + QueueEvents + Queue kaynaklarını kapatır.
 */
export class BullMQAdapter {
  private readonly queues: Map<string, BullMQQueue> = new Map();
  private readonly workers: Map<string, Worker[]> = new Map();
  private readonly connection: RedisConnection;

  constructor(connection: RedisConnection) {
    this.connection = connection;
  }

  /**
   * Adı verilen kuyruğu açar (factory — lazy + önbellekli).
   * Queue + QueueEvents kurulur; retry seçenekleri `opts.retryOptions` ile
   * verilir (verilmezse boş).
   */
  async openQueue(
    name: string,
    options: OpenQueueOptions = {},
  ): Promise<BullMQQueue> {
    const existing = this.queues.get(name);
    if (existing) return existing;

    const connection = this.redisConnection();
    const queue = new Queue(name, {
      connection,
      defaultJobOptions: options.retryOptions ?? {},
    });
    const queueEvents = new QueueEvents(name, { connection });

    queueEvents.on("failed", ({ jobId, failedReason }) => {
      console.error(`[BullMQ] Job failed: ${name}`, {
        jobId,
        reason: failedReason,
      });
    });

    const facade = new BullMQQueue(
      name,
      { connection, trackWorker: this.trackWorker.bind(this) },
      queue,
      queueEvents,
    );
    this.queues.set(name, facade);
    return facade;
  }

  /** Açık tüm kuyrukların sayaçlarını döner (name = kuyruk adı). */
  async queueStatus(): Promise<QueueStatus[]> {
    return Promise.all([...this.queues.values()].map((q) => q.stats()));
  }

  /**
   * Sağlık kontrolü: yalnızca redis ping'i.
   * Hata durumunda throw ETMEZ — false döner.
   */
  async health(): Promise<boolean> {
    try {
      return await this.connection.ping();
    } catch (error) {
      console.error("[BullMQ] Health check failed:", error);
      return false;
    }
  }

  /** Tüm worker, QueueEvents ve Queue kaynaklarını kapatır. */
  async close(): Promise<void> {
    await Promise.all(
      [...this.workers.values()].flat().map((w) => w.close()),
    );
    await Promise.all([...this.queues.values()].map((q) => q.close()));
  }

  /** Facade'ın kurduğu worker'ları toplu kapatma için izler. */
  private trackWorker(queueName: string, worker: Worker): void {
    const list = this.workers.get(queueName) ?? [];
    list.push(worker);
    this.workers.set(queueName, list);
  }

  /** Queue/Worker/QueueEvents için Redis bağlantı bilgisi. */
  private redisConnection(): RedisConnectionInfo {
    const config = this.connection.connectionConfig();
    return {
      host: config.host || "localhost",
      port: config.port || 6379,
      password: config.password,
      db: config.db,
    };
  }
}
