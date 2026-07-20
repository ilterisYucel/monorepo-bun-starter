// packages/core/src/messaging/bullmq-adapter.ts

import { Queue, Worker, Job, QueueEvents } from "bullmq";
import type { DeviceJob, JobType, JobResult } from "@gd-monorepo/shared-types";
import type { IMessageQueue, QueueStatus, WorkerOptions } from "./interface";
import type { RedisConnection } from "./redis";
import type { JobsOptions, RepeatOptions } from "bullmq";

const DEFAULT_JOB_OPTIONS: JobsOptions = {
  attempts: 3,
  backoff: { type: "exponential", delay: 1000 },
  removeOnComplete: 100,
  removeOnFail: 50,
};

export const QUEUE_NAMES: Record<JobType, string> = {
  READ_DEVICE: "queue_read_device",
  WRITE_TELEMETRY: "queue_write_telemetry",
  COMMAND_DEVICE: "queue_command_device",
  MANAGEMENT: "queue_management",
  WS_BROADCAST: "queue_ws_broadcast",
};

export class BullMQAdapter implements IMessageQueue {
  private queues: Map<JobType, Queue> = new Map();
  private workers: Map<JobType, Worker> = new Map();
  private queueEvents: Map<JobType, QueueEvents> = new Map();
  private connection: RedisConnection;

  constructor(connection: RedisConnection) {
    this.connection = connection;
  }

  private getRedisConnection() {
    // Örnekteki gibi connection bilgilerini al
    const config = this.connection.getConnectionConfig();
    return {
      host: config.host || "localhost",
      port: config.port || 6379,
      password: config.password,
      db: config.db,
    };
  }

  private async getQueue(type: JobType): Promise<Queue> {
    if (!this.queues.has(type)) {
      const queue = new Queue(QUEUE_NAMES[type], {
        connection: this.getRedisConnection(),
        defaultJobOptions: DEFAULT_JOB_OPTIONS,
      });
      this.queues.set(type, queue);
      await this.setupQueueEvents(type);
    }
    return this.queues.get(type)!;
  }

  private async setupQueueEvents(type: JobType): Promise<void> {
    const queueEvents = new QueueEvents(QUEUE_NAMES[type], {
      connection: this.getRedisConnection(),
    });

    queueEvents.on("waiting", ({ jobId }) => {
      // console.log(`[BullMQ] Job waiting: ${type}`, { jobId });
    });

    queueEvents.on("active", ({ jobId }) => {
      // console.log(`[BullMQ] Job active: ${type}`, { jobId });
    });

    queueEvents.on("completed", ({ jobId }) => {
      // console.log(`[BullMQ] Job completed: ${type}`, { jobId });
    });

    queueEvents.on("failed", ({ jobId, failedReason }) => {
      console.error(`[BullMQ] Job failed: ${type}`, {
        jobId,
        reason: failedReason,
      });
    });

    this.queueEvents.set(type, queueEvents);
  }

  async addJob(job: DeviceJob): Promise<void> {
    const queue = await this.getQueue(job.type);
    await queue.add(job.type, job, {
      jobId: job.jobId,
      priority: job.priority ?? 10,
    });
  }

  async executeAndWait(jobData: DeviceJob, timeoutMs: number): Promise<JobResult> {
    const queue = await this.getQueue(jobData.type);
    const job = await queue.add(jobData.type, jobData, {
      jobId: jobData.jobId,
      priority: jobData.priority ?? 10,
    });

    const events = this.queueEvents.get(jobData.type);
    if (!events) {
      console.error(`[BullMQ] executeAndWait: no QueueEvents for ${jobData.type} — job may not be consumed`);
      try {
        const result = await job.waitUntilFinished(null as any, timeoutMs);
        if (result && typeof result === "object") return result as JobResult;
        return { success: true };
      } catch (err) {
        return { success: false, reason: String(err) };
      }
    }

    try {
      const result = await job.waitUntilFinished(events, timeoutMs);
      if (result && typeof result === "object") return result as JobResult;
      return { success: true };
    } catch (err) {
      return { success: false, reason: String(err) };
    }
  }

  async addRepeatableJob(
    name: string,
    job: DeviceJob,
    pattern: string,
  ): Promise<void> {
    const queue = await this.getQueue(job.type);
    const repeatOptions: RepeatOptions = { pattern };

    await queue.add(name, job, {
      repeat: repeatOptions,
      jobId: `${job.type}-${job.deviceId}-${name}`,
    });
  }

  async addRepeatableJobEvery(
    name: string,
    job: DeviceJob,
    everyMs: number,
  ): Promise<void> {
    const queue = await this.getQueue(job.type);
    const repeatOptions: RepeatOptions = { every: everyMs };

    await queue.add(name, job, {
      repeat: repeatOptions,
      jobId: `${job.type}-${job.deviceId}-${name}`,
    });
  }

  async registerWorkerFor(
    type: JobType,
    processor: (job: DeviceJob) => Promise<unknown>,
    options?: WorkerOptions,
  ): Promise<void> {
    const worker = new Worker(
      QUEUE_NAMES[type],
      async (bullJob: Job) => {
        const jobData = bullJob.data as DeviceJob;
        return await processor(jobData);
      },
      {
        connection: this.getRedisConnection(),
        concurrency: options?.concurrency ?? 5,
      },
    );

    if (options?.onCompleted) {
      worker.on("completed", (bullJob) => {
        const jobData = bullJob.data as DeviceJob;
        options.onCompleted!(jobData);
      });
    }

    if (options?.onFailed) {
      worker.on("failed", (bullJob, err) => {
        if (bullJob) {
          const jobData = bullJob.data as DeviceJob;
          options.onFailed!(jobData, err);
        }
      });
    }

    worker.on("error", (err) => {
      console.error(`[BullMQ] Worker error for ${type}:`, err);
    });

    this.workers.set(type, worker);
  }

  async registerWorker(
    processor: (job: DeviceJob) => Promise<unknown>,
    options?: WorkerOptions,
  ): Promise<void> {
    const jobTypes: JobType[] = [
      "READ_DEVICE",
      "WRITE_TELEMETRY",
      "COMMAND_DEVICE",
      "MANAGEMENT",
      "WS_BROADCAST",
    ];

    for (const type of jobTypes) {
      const worker = new Worker(
        QUEUE_NAMES[type],
        async (bullJob: Job) => {
          const jobData = bullJob.data as DeviceJob;
          return await processor(jobData);
        },
        {
          connection: this.getRedisConnection(),
          concurrency: options?.concurrency ?? 5,
        },
      );

      if (options?.onCompleted) {
        worker.on("completed", (bullJob) => {
          const jobData = bullJob.data as DeviceJob;
          options.onCompleted!(jobData);
        });
      }

      if (options?.onFailed) {
        worker.on("failed", (bullJob, err) => {
          if (bullJob) {
            const jobData = bullJob.data as DeviceJob;
            options.onFailed!(jobData, err);
          }
        });
      }

      worker.on("error", (err) => {
        console.error(`[BullMQ] Worker error for ${type}:`, err);
      });

      this.workers.set(type, worker);
    }
  }

  async getQueueStatus(): Promise<QueueStatus[]> {
    const statuses: QueueStatus[] = [];

    for (const [type, queue] of this.queues) {
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        queue.getWaitingCount(),
        queue.getActiveCount(),
        queue.getCompletedCount(),
        queue.getFailedCount(),
        queue.getDelayedCount(),
      ]);

      statuses.push({
        name: type,
        waiting,
        active,
        completed,
        failed,
        delayed,
      });
    }

    return statuses;
  }

  async getQueueStats(type: JobType): Promise<QueueStatus | null> {
    const queue = this.queues.get(type);
    if (!queue) return null;

    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ]);

    return { name: type, waiting, active, completed, failed, delayed };
  }

  async health(): Promise<boolean> {
    try {
      const redisHealth = await this.connection.ping();
      if (!redisHealth) return false;

      const queue = this.queues.get("READ_DEVICE");
      if (queue) {
        const counts = await queue.getJobCounts();
        return counts !== undefined;
      }
      return true;
    } catch (error) {
      console.error("[BullMQ] Health check failed:", error);
      return false;
    }
  }

  async close(): Promise<void> {
    // Worker'ları kapat
    for (const worker of this.workers.values()) {
      await worker.close();
    }

    // QueueEvents'leri kapat
    for (const queueEvents of this.queueEvents.values()) {
      await queueEvents.close();
    }

    // Queue'ları kapat
    for (const queue of this.queues.values()) {
      await queue.close();
    }
  }
}
