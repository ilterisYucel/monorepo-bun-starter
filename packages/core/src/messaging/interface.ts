// packages/core/src/messaging/interface.ts

import type { DeviceJob, JobType } from "@gd-monorepo/shared-types";

/**
 * Message Queue Worker yapılandırma seçenekleri
 */
export interface WorkerOptions {
  /**
   * Aynı anda kaç job'un işleneceği
   * @default 5
   */
  concurrency?: number;

  /**
   * Job başarıyla tamamlandığında çağrılacak callback
   * @param job - Tamamlanan job
   */
  onCompleted?: (job: DeviceJob) => void;

  /**
   * Job başarısız olduğunda çağrılacak callback
   * @param job - Başarısız olan job
   * @param error - Hata nesnesi
   */
  onFailed?: (job: DeviceJob, error: Error) => void;
}

/**
 * Queue istatistikleri
 */
export interface QueueStatus {
  /** Queue adı (READ_DEVICE, WRITE_TELEMETRY, COMMAND_DEVICE) */
  name: string;
  /** Bekleyen job sayısı */
  waiting: number;
  /** Aktif olarak işlenen job sayısı */
  active: number;
  /** Tamamlanan job sayısı */
  completed: number;
  /** Başarısız olan job sayısı */
  failed: number;
  /** Geciktirilmiş job sayısı */
  delayed: number;
}

/**
 * Message Queue Abstraction Interface
 *
 * Bu interface, farklı message queue sistemlerini (BullMQ, Kafka, RabbitMQ, AWS SQS, Google Pub/Sub)
 * aynı API üzerinden kullanmayı sağlar.
 *
 * @example
 * ```typescript
 * // BullMQ ile
 * const bullmq = new BullMQAdapter(redisConnection);
 * await bullmq.addJob({ type: 'READ_DEVICE', deviceId: 'rack-1' });
 *
 * // Kafka ile (implementasyon yapıldığında)
 * const kafka = new KafkaAdapter(kafkaConnection);
 * await kafka.addJob({ type: 'READ_DEVICE', deviceId: 'rack-1' });
 * ```
 */
export interface IMessageQueue {
  /**
   * Queue'ya tek bir job ekler
   *
   * @param job - Eklenecek job (DeviceJob tipinde)
   * @returns Promise
   *
   * @example
   * ```typescript
   * await messageQueue.addJob({
   *   jobId: 'job-123',
   *   type: 'READ_DEVICE',
   *   deviceId: 'battery-rack-1',
   *   timestamp: new Date().toISOString(),
   *   priority: 1
   * });
   * ```
   */
  addJob(job: DeviceJob): Promise<void>;

  /**
   * Tekrarlayan job ekler.
   *
   * NOT: Bu özellik BullMQ gibi bazı sistemlerde native desteklenir.
   * Kafka, SQS gibi sistemlerde native destek yoktur, implementasyon sırasında buna göre davranılmalıdır.
   *
   * @param name - Job'un benzersiz adı
   * @param job - Eklenecek job (DeviceJob tipinde)
   * @param pattern - Zamanlama pattern (cron formatında, örn: her 5 saniye icin "slash 5 slash 1 slash 1 slash 1 slash 1 slash 1")
   * @returns Promise
   *
   * @example
   * ```typescript
   * // Her 5 saniyede bir calisacak job
   * await messageQueue.addRepeatableJob(
   *   'read-rack-1',
   *   {
   *     jobId: 'read-rack-1',
   *     type: 'READ_DEVICE',
   *     deviceId: 'battery-rack-1',
   *     timestamp: new Date().toISOString(),
   *   },
   *   'slash 5 slash 1 slash 1 slash 1 slash 1 slash 1'
   * );
   * ```
   */
  addRepeatableJob(
    name: string,
    job: DeviceJob,
    pattern: string,
  ): Promise<void>;

  /**
   * Milisaniye bazlı tekrarlayan job ekler.
   * Cron pattern yerine doğrudan milisaniye aralığı kullanır.
   *
   * @param name - Job'un benzersiz adı
   * @param job - Eklenecek job
   * @param everyMs - Her kaç milisaniyede bir çalışacağı (min: 100ms)
   * @returns Promise
   */
  addRepeatableJobEvery(
    name: string,
    job: DeviceJob,
    everyMs: number,
  ): Promise<void>;

  /**
   * Queue'yu dinleyen worker'ı kaydeder
   *
   * Worker, queue'ya gelen job'lari alır ve işler.
   *
   * @param processor - Job işleme fonksiyonu
   * @param options - Worker yapılandırma seçenekleri
   * @returns Promise
   *
   * @example
   * ```typescript
   * await messageQueue.registerWorker(async (job) => {
   *   console.log('Processing job:', job.type, job.deviceId);
   * });
   *
   * await messageQueue.registerWorker(
   *   async (job) => { await processDeviceJob(job); },
   *   {
   *     concurrency: 10,
   *     onCompleted: (job) => console.log('Job completed'),
   *     onFailed: (job, error) => console.error('Job failed', error)
   *   }
   * );
   * ```
   */
  registerWorker(
    processor: (job: DeviceJob) => Promise<void>,
    options?: WorkerOptions,
  ): Promise<void>;

  /**
   * Tüm queue'lari, worker'lari ve bağlantilari kapatir
   *
   * @returns Promise
   *
   * @example
   * ```typescript
   * process.on('SIGTERM', async () => {
   *   await messageQueue.close();
   *   process.exit(0);
   * });
   * ```
   */
  close(): Promise<void>;

  /**
   * Tüm queue'larin durumunu getirir
   *
   * @returns Her queue için istatistikler
   *
   * @example
   * ```typescript
   * const status = await messageQueue.getQueueStatus();
   * console.log('READ_DEVICE waiting:', status.find(s => s.name === 'READ_DEVICE')?.waiting);
   * ```
   */
  getQueueStatus(): Promise<QueueStatus[]>;

  /**
   * Belirli bir queue tipinin istatistiklerini getirir
   *
   * @param type - Queue tipi (READ_DEVICE, WRITE_TELEMETRY, COMMAND_DEVICE)
   * @returns Queue istatistikleri veya null
   *
   * @example
   * ```typescript
   * const readStats = await messageQueue.getQueueStats('READ_DEVICE');
   * if (readStats) {
   *   console.log('Waiting: ${readStats.waiting}, Active: ${readStats.active}');
   * }
   * ```
   */
  getQueueStats(type: JobType): Promise<QueueStatus | null>;

  /**
   * Message Queue sisteminin sağlık durumunu kontrol eder
   *
   * @returns true: sağlıklı, false: sorun var
   *
   * @example
   * ```typescript
   * if (await messageQueue.health()) {
   *   console.log('Message queue is healthy');
   * } else {
   *   console.error('Message queue connection problem');
   * }
   * ```
   */
  health(): Promise<boolean>;
}
