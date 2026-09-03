// packages/core/src/messaging/bullmq-queue.ts

import { Worker, type Job, type RepeatOptions } from "bullmq";
import type { Queue, QueueEvents } from "bullmq";
import type { QueueStatus } from "./interface";

/** Facade'a enjekte edilen bağlantı bilgisi (DI — state enjeksiyonu). */
export interface RedisConnectionInfo {
  host: string;
  port: number;
  password?: string;
  db?: number;
}

/** Jenerik worker yapılandırması — payload tipi bilinmez (unknown). */
export interface QueueWorkerOptions {
  /** Aynı anda işlenecek job sayısı. @default 5 */
  concurrency?: number;
  /** Job başarıyla tamamlandığında çağrılır. */
  onCompleted?: (data: unknown) => void;
  /** Job başarısız olduğunda çağrılır. */
  onFailed?: (data: unknown, error: Error) => void;
}

/** executeAndWait sonucu — worker dönüş nesnesi spread ile taşınır. */
export interface QueueResult {
  success: boolean;
  reason?: string;
  data?: unknown;
}

/** Facade'ın adapter'dan aldığı yetenekler (döngüsel import önlenir). */
interface BullMQQueueDependencies {
  connection: RedisConnectionInfo;
  trackWorker(queueName: string, worker: Worker): void;
}

/**
 * BullMQQueue — TEK BullMQ kuyruğunun facade'ı.
 *
 * Sözleşme:
 * - Tüm bullmq işlemleri (Queue/Worker/QueueEvents) bu sınıfta sabitlenir;
 *   payload tipi `unknown` — jenerik adapter, sistem işlerini bilmez.
 * - add/addRepeatable/addRepeatablePattern: job ekleme; jobId/delay/priority/
 *   startDate opsiyoneldir.
 * - executeAndWait: job ekler + QueueEvents üzerinden bitişi bekler; hata/
 *   timeout'ta throw ETMEZ — `{ success: false, reason }` döner. Worker nesne
 *   döndürürse alanları sonuca spread edilir (`success: true` varsayılan,
 *   worker'ın `success: false`'u EZER).
 * - registerWorker: worker'ı kuyruk adıyla kurar; kurulan worker adapter'a
 *   kaydedilir (close() toplu kapatır).
 * - stats: sayaçlardan biri reddedilirse 0 sayılır (kademeli bozulma).
 * - close: QueueEvents + Queue kapatılır.
 */
export class BullMQQueue {
  private readonly queue: Queue;
  private readonly queueEvents: QueueEvents;
  private readonly name: string;
  private readonly deps: BullMQQueueDependencies;

  constructor(
    name: string,
    deps: BullMQQueueDependencies,
    queue: Queue,
    queueEvents: QueueEvents,
  ) {
    this.name = name;
    this.deps = deps;
    this.queue = queue;
    this.queueEvents = queueEvents;
  }

  /**
   * Kuyruğa tek job ekler.
   *
   * @param jobName - Job adı (bullmq'de kuyruk içi işlem adı)
   * @param data - Job verisi (jenerik)
   * @param opts - Opsiyonel: delay (ms), jobId, priority
   */
  async add(
    jobName: string,
    data: unknown,
    opts?: { delay?: number; jobId?: string; priority?: number },
  ): Promise<void> {
    await this.queue.add(jobName, data, {
      ...(opts?.jobId ? { jobId: opts.jobId } : undefined),
      ...(opts?.priority !== undefined ? { priority: opts.priority } : undefined),
      ...(opts?.delay ? { delay: opts.delay } : undefined),
    });
  }

  /**
   * Milisaniye aralığıyla tekrarlayan job ekler.
   * startDate verilmezse BullMQ `Date.now() + everyMs`'i kullanır.
   */
  async addRepeatable(
    jobName: string,
    data: unknown,
    everyMs: number,
    opts?: { jobId?: string; startDate?: Date },
  ): Promise<void> {
    const repeat: RepeatOptions = { every: everyMs };
    if (opts?.startDate) {
      repeat.startDate = opts.startDate;
    }
    await this.queue.add(jobName, data, {
      repeat,
      ...(opts?.jobId ? { jobId: opts.jobId } : undefined),
    });
  }

  /** Cron pattern ile tekrarlayan job ekler. */
  async addRepeatablePattern(
    jobName: string,
    data: unknown,
    pattern: string,
    opts?: { jobId?: string },
  ): Promise<void> {
    await this.queue.add(jobName, data, {
      repeat: { pattern },
      ...(opts?.jobId ? { jobId: opts.jobId } : undefined),
    });
  }

  /**
   * Job ekler ve tamamlanmasını bekler (senkron request-response).
   * Hata/timeout'ta throw ETMEZ — `{ success: false, reason }` döner.
   */
  async executeAndWait(
    jobName: string,
    data: unknown,
    timeoutMs: number,
    opts?: { jobId?: string; priority?: number },
  ): Promise<QueueResult> {
    const job = await this.queue.add(jobName, data, {
      ...(opts?.jobId ? { jobId: opts.jobId } : undefined),
      ...(opts?.priority !== undefined ? { priority: opts.priority } : undefined),
    });

    try {
      const result = await job.waitUntilFinished(this.queueEvents, timeoutMs);
      if (result && typeof result === "object") {
        return {
          success: true,
          ...(result as Record<string, unknown>),
        } as QueueResult;
      }
      return { success: true };
    } catch (err) {
      return { success: false, reason: String(err) };
    }
  }

  /**
   * Bu kuyruğu dinleyen worker'ı kaydeder.
   * Kurulan worker adapter tarafından izlenir (adapter.close() toplu kapatır).
   */
  async registerWorker(
    processor: (job: unknown) => Promise<unknown>,
    options?: QueueWorkerOptions,
  ): Promise<void> {
    const worker = new Worker(
      this.name,
      async (bullJob: Job) => {
        return await processor((bullJob as Job<unknown>).data);
      },
      {
        connection: this.deps.connection,
        concurrency: options?.concurrency ?? 5,
      },
    );

    if (options?.onCompleted) {
      worker.on("completed", (bullJob) => {
        options.onCompleted!((bullJob as Job<unknown>).data);
      });
    }

    if (options?.onFailed) {
      worker.on("failed", (bullJob, err) => {
        if (bullJob) {
          options.onFailed!((bullJob as Job<unknown>).data, err);
        }
      });
    }

    worker.on("error", (err) => {
      console.error(`[BullMQ] Worker error for ${this.name}:`, err);
    });

    this.deps.trackWorker(this.name, worker);
  }

  /**
   * Bu kuyruğun sayaçlarını döner.
   * Reddedilen bir sayaç 0 sayılır (kademeli bozulma — diğerleri korunur).
   */
  async stats(): Promise<QueueStatus> {
    const counts = await Promise.allSettled([
      this.queue.getWaitingCount(),
      this.queue.getActiveCount(),
      this.queue.getCompletedCount(),
      this.queue.getFailedCount(),
      this.queue.getDelayedCount(),
    ]);
    const [waiting, active, completed, failed, delayed] =
      this.countResults(counts);
    return { name: this.name, waiting, active, completed, failed, delayed };
  }

  /** BullMQ job sayaçlarını döner (health denetimleri için). */
  async jobCounts(): Promise<Record<string, number> | undefined> {
    return this.queue.getJobCounts();
  }

  /** QueueEvents + Queue kaynaklarını kapatır. */
  async close(): Promise<void> {
    await Promise.all([this.queueEvents.close(), this.queue.close()]);
  }

  private countResults(
    counts: PromiseSettledResult<number>[],
  ): [number, number, number, number, number] {
    const value = (index: number): number => {
      const item = counts[index];
      return item?.status === "fulfilled" ? item.value : 0;
    };
    return [value(0), value(1), value(2), value(3), value(4)];
  }
}
