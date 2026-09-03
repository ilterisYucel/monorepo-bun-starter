// packages/platform/messaging/src/platform-message-queue.ts

import type { JobsOptions } from "bullmq";
import {
  BullMQAdapter,
  type BullMQQueue,
  type RedisConnection,
} from "@gd-monorepo/core";
import type {
  IMessageQueue,
  QueueStatus,
  WorkerOptions,
} from "@gd-monorepo/core";
import type { DeviceJob, JobType, JobResult } from "@gd-monorepo/shared-types";

/**
 * Job bazlı retry politikası (Faz 0 ek 3) — SİSTEM varsayılanları.
 * Generic adapter (core) retry politikası bilmez; bu değerler bu pakette
 * yaşar ve `PlatformMessageQueueConfig.retryOptions` ile override edilir.
 *
 * - READ_DEVICE: attempts 1 — poll = doğal retry; bayat örnek ve retry
 *   fırtınası önlenir.
 * - WRITE_TELEMETRY: attempts 5 + backoff — okunan veri kaybedilemez;
 *   removeOnFail yüksek tutulur (dead-letter).
 * - COMMAND_DEVICE: 3 — komut kaybedilemez; writeAtomic idempotency sağlar.
 * - MANAGEMENT / WS_BROADCAST: 1-2 — türetilmiş işler.
 * - FETCH_EXTERNAL: 3 — dış toplayıcı.
 */
export const JOB_RETRY_OPTIONS: Record<JobType, JobsOptions> = {
  READ_DEVICE: {
    attempts: 1,
    removeOnComplete: 100,
    removeOnFail: 50,
  },
  WRITE_TELEMETRY: {
    attempts: 5,
    backoff: { type: "exponential", delay: 1000 },
    removeOnComplete: 100,
    removeOnFail: 500,
  },
  COMMAND_DEVICE: {
    attempts: 3,
    backoff: { type: "exponential", delay: 1000 },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
  MANAGEMENT: {
    attempts: 1,
    removeOnComplete: 100,
    removeOnFail: 50,
  },
  WS_BROADCAST: {
    attempts: 2,
    removeOnComplete: 100,
    removeOnFail: 50,
  },
  FETCH_EXTERNAL: {
    attempts: 3,
    backoff: { type: "exponential", delay: 1000 },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
};

/** Varsayılan kuyruk adları — ürün config'i PlatformMessageQueueConfig ile override edebilir. */
export const QUEUE_NAMES: Record<JobType, string> = {
  READ_DEVICE: "queue_read_device",
  WRITE_TELEMETRY: "queue_write_telemetry",
  COMMAND_DEVICE: "queue_command_device",
  MANAGEMENT: "queue_management",
  WS_BROADCAST: "queue_ws_broadcast",
  FETCH_EXTERNAL: "queue_fetch_external",
};

/** Bilinen JobType listesi — override whitelist'i ve registerWorker döngüsü için. */
const JOB_TYPES: JobType[] = [
  "READ_DEVICE",
  "WRITE_TELEMETRY",
  "COMMAND_DEVICE",
  "MANAGEMENT",
  "WS_BROADCAST",
  "FETCH_EXTERNAL",
];

/**
 * PlatformMessageQueue dışarıdan verilebilir yapılandırması.
 * Sistem kuyruklarının adları ve retry politikaları ÜRÜN config'inden verilir.
 */
export interface PlatformMessageQueueConfig {
  /**
   * JobType başına kuyruk adı override'ları.
   * Verilmeyen tipler varsayılan adı (QUEUE_NAMES) kullanır.
   * Bilinmeyen anahtarlar yok sayılır.
   */
  queueNames?: Partial<Record<JobType, string>>;
  /**
   * JobType başına retry seçeneği override'ları.
   * Verilen tipin VARSAYILAN seçenekleri TAMAMEN değiştirilir
   * (kısmi birleştirme YAPILMAZ).
   */
  retryOptions?: Partial<Record<JobType, JobsOptions>>;
}

/**
 * PlatformMessageQueue — IMessageQueue sözleşmesinin sistem implementasyonu.
 *
 * Katmanlar (bkz. docs/roadmap/mesajlasma-katmanlari.md):
 * - Generic `BullMQAdapter` (core) adlarla çalışır — JobType bilmez.
 * - JobType'ı bilen TEK yer burasıdır: kuyruk adları + retry politikaları
 *   varsayılanları burada yaşar; `PlatformMessageQueueConfig` ile override
 *   edilir.
 *
 * Sözleşme:
 * - Kuyruklar LAZY açılır (ilk kullanımda); aynı tip tek örnek önbelleklenir.
 * - executeAndWait: hata/timeout'ta throw ETMEZ — `{ success: false, reason }`.
 * - Repeatable jobId formatı: `${type}-${deviceId}-${name}`.
 * - queueStatus/queueStats: `name` = JobType; reddedilen sayaç 0 sayılır
 *   (allSettled — kademeli bozulma).
 * - health: redis ping + READ_DEVICE kuyruğu açıksa jobCounts denetimi.
 * - close: adapter üzerinden tüm kaynakları kapatır.
 */
export class PlatformMessageQueue implements IMessageQueue {
  private readonly adapter: BullMQAdapter;
  private readonly opened: Map<JobType, BullMQQueue> = new Map();
  private readonly queueNames: Record<JobType, string>;
  private readonly retryOptions: Record<JobType, JobsOptions>;

  constructor(
    connection: RedisConnection,
    config: PlatformMessageQueueConfig = {},
  ) {
    this.adapter = new BullMQAdapter(connection);
    this.queueNames = this.resolveOverrides(QUEUE_NAMES, config.queueNames);
    this.retryOptions = this.resolveOverrides(
      JOB_RETRY_OPTIONS,
      config.retryOptions,
    );
  }

  /**
   * Varsayılanların üzerine config override'larını uygular.
   * Yalnızca bilinen JobType anahtarları kabul edilir — bilinmeyen anahtar
   * (JS'ten gelen ürün config'i) sessizce yok sayılır.
   */
  private resolveOverrides<T>(
    defaults: Record<JobType, T>,
    overrides?: Partial<Record<JobType, T>>,
  ): Record<JobType, T> {
    const resolved = { ...defaults };
    for (const key of Object.keys(overrides ?? {}) as JobType[]) {
      if (JOB_TYPES.includes(key) && overrides?.[key] !== undefined) {
        resolved[key] = overrides[key]!;
      }
    }
    return resolved;
  }

  /** Tip için kuyruk facade'ını döner — yoksa generic adapter üzerinden açar. */
  private async queueFor(type: JobType): Promise<BullMQQueue> {
    const existing = this.opened.get(type);
    if (existing) return existing;

    const queue = await this.adapter.openQueue(this.queueNames[type], {
      retryOptions: this.retryOptions[type],
    });
    this.opened.set(type, queue);
    return queue;
  }

  /**
   * Kuyruğa tek job ekler.
   *
   * @param job - Eklenecek job (DeviceJob)
   * @param opts - Opsiyonel gecikme (ms) — delay ile gelecekte çalışır
   */
  async addJob(job: DeviceJob, opts?: { delay?: number }): Promise<void> {
    const queue = await this.queueFor(job.type);
    await queue.add(job.type, job, {
      jobId: job.jobId,
      priority: job.priority ?? 10,
      ...(opts?.delay ? { delay: opts.delay } : undefined),
    });
  }

  /**
   * Job ekler ve tamamlanmasını bekler (senkron request-response).
   * Hata/timeout'ta throw ETMEZ — `{ success: false, reason }` döner.
   */
  async executeAndWait(
    jobData: DeviceJob,
    timeoutMs: number,
  ): Promise<JobResult> {
    const queue = await this.queueFor(jobData.type);
    const result = await queue.executeAndWait(
      jobData.type,
      jobData,
      timeoutMs,
      { jobId: jobData.jobId, priority: jobData.priority ?? 10 },
    );
    return result as JobResult;
  }

  /** Cron pattern ile tekrarlayan job ekler (jobId: `${type}-${deviceId}-${name}`). */
  async addRepeatableJob(
    name: string,
    job: DeviceJob,
    pattern: string,
  ): Promise<void> {
    const queue = await this.queueFor(job.type);
    await queue.addRepeatablePattern(name, job, pattern, {
      jobId: `${job.type}-${job.deviceId}-${name}`,
    });
  }

  /**
   * Milisaniye aralığıyla tekrarlayan job ekler.
   * startDate verilmezse BullMQ `Date.now() + everyMs`'i kullanır.
   */
  async addRepeatableJobEvery(
    name: string,
    job: DeviceJob,
    everyMs: number,
    startDate?: Date,
  ): Promise<void> {
    const queue = await this.queueFor(job.type);
    await queue.addRepeatable(name, job, everyMs, {
      jobId: `${job.type}-${job.deviceId}-${name}`,
      ...(startDate ? { startDate } : undefined),
    });
  }

  /** Tek tip için worker kaydeder. */
  async registerWorkerFor(
    type: JobType,
    processor: (job: DeviceJob) => Promise<unknown>,
    options?: WorkerOptions,
  ): Promise<void> {
    const queue = await this.queueFor(type);
    await queue.registerWorker(
      (data) => processor(data as DeviceJob),
      this.adaptWorkerOptions(options),
    );
  }

  /** TÜM bilinen tipler için aynı processor ile worker kaydeder. */
  async registerWorker(
    processor: (job: DeviceJob) => Promise<unknown>,
    options?: WorkerOptions,
  ): Promise<void> {
    for (const type of JOB_TYPES) {
      const queue = await this.queueFor(type);
      await queue.registerWorker(
        (data) => processor(data as DeviceJob),
        this.adaptWorkerOptions(options),
      );
    }
  }

  /** IMessageQueue WorkerOptions → jenerik QueueWorkerOptions uyarlaması. */
  private adaptWorkerOptions(options?: WorkerOptions) {
    if (!options) return undefined;
    return {
      concurrency: options.concurrency,
      ...(options.onCompleted
        ? { onCompleted: (data: unknown) => options.onCompleted!(data as DeviceJob) }
        : undefined),
      ...(options.onFailed
        ? {
            onFailed: (data: unknown, error: Error) =>
              options.onFailed!(data as DeviceJob, error),
          }
        : undefined),
    };
  }

  /** Açılmış tüm kuyrukların sayaçlarını döner (name = JobType). */
  async queueStatus(): Promise<QueueStatus[]> {
    return Promise.all(
      [...this.opened.entries()].map(async ([type, queue]) => {
        const stats = await queue.stats();
        return { ...stats, name: type };
      }),
    );
  }

  /** Tek tipin sayaçlarını döner; kuyruk hiç açılmamışsa null. */
  async queueStats(type: JobType): Promise<QueueStatus | null> {
    const queue = this.opened.get(type);
    if (!queue) return null;
    const stats = await queue.stats();
    return { ...stats, name: type };
  }

  /**
   * Sağlık kontrolü: redis ping; READ_DEVICE kuyruğu açıksa job sayıları da
   * denetlenir. Hata durumunda throw ETMEZ — false döner.
   */
  async health(): Promise<boolean> {
    try {
      const redisHealth = await this.adapter.health();
      if (!redisHealth) return false;

      const queue = this.opened.get("READ_DEVICE");
      if (queue) {
        const counts = await queue.jobCounts();
        return counts !== undefined;
      }
      return true;
    } catch (error) {
      console.error("[PlatformMessageQueue] Health check failed:", error);
      return false;
    }
  }

  /** Tüm worker, QueueEvents ve Queue kaynaklarını kapatır. */
  async close(): Promise<void> {
    await this.adapter.close();
  }
}
