import { describe, it, expect, vi, beforeEach } from "vitest";
import type { RedisConnection } from "@gd-monorepo/core";
import type { JobType, DeviceJob } from "@gd-monorepo/shared-types";

/**
 * PlatformMessageQueue sözleşmesi — IMessageQueue'nun sistem implementasyonu.
 *
 * Katmanlar (bkz. docs/roadmap/mesajlasma-katmanlari.md):
 * - Generic BullMQAdapter/BullMQQueue (core) adlarla çalışır — JobType bilmez.
 * - Bu sınıf JobType'ı bilen TEK yerdir: QUEUE_NAMES + JOB_RETRY_OPTIONS
 *   varsayılanları burada yaşar; config ile dışarıdan override edilir.
 *
 * Karakterize davranışlar (eski BullMQAdapter'dan taşındı):
 * - Retry haritası: READ_DEVICE:1, WRITE_TELEMETRY:5+backoff,
 *   COMMAND_DEVICE:3, MANAGEMENT:1, WS_BROADCAST:2, FETCH_EXTERNAL:3.
 * - queueNames/retryOptions override; bilinmeyen JobType anahtarı yok sayılır.
 * - executeAndWait: nesne sonuç / nesne-olmayan → {success:true} / hata →
 *   {success:false, reason}.
 * - Repeatable jobId formatı: `${type}-${deviceId}-${name}`.
 * - registerWorkerFor/registerWorker: doğru ad + concurrency + callback'ler.
 * - queueStatus/queueStats: name = JobType; reddedilen sayaç 0.
 * - health: redis ping + READ_DEVICE açıksa jobCounts denetimi.
 * - close: tüm kaynaklar kapatılır.
 */

type Handler = (...args: unknown[]) => void;

type QueueMock = {
  name: string;
  options: Record<string, unknown>;
  add: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
  getWaitingCount: ReturnType<typeof vi.fn>;
  getActiveCount: ReturnType<typeof vi.fn>;
  getCompletedCount: ReturnType<typeof vi.fn>;
  getFailedCount: ReturnType<typeof vi.fn>;
  getDelayedCount: ReturnType<typeof vi.fn>;
  getJobCounts: ReturnType<typeof vi.fn>;
};

type WorkerMock = {
  name: string;
  options: Record<string, unknown>;
  processor: (job: unknown) => Promise<unknown>;
  handlers: Record<string, Handler>;
  close: ReturnType<typeof vi.fn>;
};

type QueueEventsMock = {
  name: string;
  options: Record<string, unknown>;
  handlers: Record<string, Handler>;
  close: ReturnType<typeof vi.fn>;
};

const queueMocks: QueueMock[] = [];
const workerMocks: WorkerMock[] = [];
const queueEventsMocks: QueueEventsMock[] = [];

vi.mock("bullmq", () => {
  const makeHandlerMap = (on: ReturnType<typeof vi.fn>) => {
    const handlers: Record<string, Handler> = {};
    on.mockImplementation((event: string, handler: Handler) => {
      handlers[event] = handler;
    });
    return handlers;
  };

  return {
    Queue: class {
      name: string;
      options: Record<string, unknown>;
      add = vi.fn().mockResolvedValue({ id: "j-1" });
      close = vi.fn().mockResolvedValue(undefined);
      getWaitingCount = vi.fn().mockResolvedValue(0);
      getActiveCount = vi.fn().mockResolvedValue(0);
      getCompletedCount = vi.fn().mockResolvedValue(0);
      getFailedCount = vi.fn().mockResolvedValue(0);
      getDelayedCount = vi.fn().mockResolvedValue(0);
      getJobCounts = vi.fn().mockResolvedValue({});
      constructor(name: string, options: Record<string, unknown>) {
        this.name = name;
        this.options = options;
        queueMocks.push(this as unknown as QueueMock);
      }
    },
    Worker: class {
      name: string;
      options: Record<string, unknown>;
      processor: (job: unknown) => Promise<unknown>;
      handlers: Record<string, Handler>;
      on = vi.fn();
      close = vi.fn().mockResolvedValue(undefined);
      constructor(
        name: string,
        processor: (job: unknown) => Promise<unknown>,
        options: Record<string, unknown>,
      ) {
        this.name = name;
        this.processor = processor;
        this.options = options;
        this.handlers = makeHandlerMap(this.on);
        workerMocks.push(this as unknown as WorkerMock);
      }
    },
    QueueEvents: class {
      name: string;
      options: Record<string, unknown>;
      handlers: Record<string, Handler>;
      on = vi.fn();
      close = vi.fn().mockResolvedValue(undefined);
      constructor(name: string, options: Record<string, unknown>) {
        this.name = name;
        this.options = options;
        this.handlers = makeHandlerMap(this.on);
        queueEventsMocks.push(this as unknown as QueueEventsMock);
      }
    },
    Job: class {},
  };
});

import {
  PlatformMessageQueue,
  QUEUE_NAMES,
  JOB_RETRY_OPTIONS,
} from "./platform-message-queue";

function makeConnection(overrides: Partial<RedisConnection> = {}): RedisConnection {
  return {
    connectionConfig: () => ({ host: "localhost", port: 6379 }),
    ping: vi.fn().mockResolvedValue(true),
    connect: vi.fn(),
    disconnect: vi.fn(),
    ...overrides,
  } as unknown as RedisConnection;
}

const ALL_TYPES: JobType[] = [
  "READ_DEVICE",
  "WRITE_TELEMETRY",
  "COMMAND_DEVICE",
  "MANAGEMENT",
  "WS_BROADCAST",
  "FETCH_EXTERNAL",
];

function job(type: JobType, overrides: Partial<DeviceJob> = {}): DeviceJob {
  return {
    jobId: `j-${type}`,
    type,
    deviceId: "bsc-1",
    timestamp: new Date().toISOString(),
    ...overrides,
  } as DeviceJob;
}

function attemptsFor(name: string): number | undefined {
  const creation = queueMocks.find((q) => q.name === name);
  return creation?.options.defaultJobOptions?.attempts as number | undefined;
}

function queueNamed(name: string): QueueMock {
  const found = queueMocks.find((q) => q.name === name);
  if (!found) throw new Error(`Queue mock bulunamadı: ${name}`);
  return found;
}

beforeEach(() => {
  queueMocks.length = 0;
  workerMocks.length = 0;
  queueEventsMocks.length = 0;
  vi.restoreAllMocks();
});

describe("PlatformMessageQueue retry haritası (T0.12)", () => {
  it("harita politika değerlerini taşır", () => {
    expect(JOB_RETRY_OPTIONS.READ_DEVICE.attempts).toBe(1);
    expect(JOB_RETRY_OPTIONS.WRITE_TELEMETRY.attempts).toBe(5);
    expect(JOB_RETRY_OPTIONS.COMMAND_DEVICE.attempts).toBe(3);
    expect(JOB_RETRY_OPTIONS.MANAGEMENT.attempts).toBe(1);
    expect(JOB_RETRY_OPTIONS.WS_BROADCAST.attempts).toBe(2);
    expect(JOB_RETRY_OPTIONS.FETCH_EXTERNAL.attempts).toBe(3);
  });

  it("READ_DEVICE kuyruğu attempts:1 ile açılır (poll = doğal retry)", async () => {
    const mq = new PlatformMessageQueue(makeConnection());
    await mq.addJob(job("READ_DEVICE"));
    expect(attemptsFor(QUEUE_NAMES.READ_DEVICE)).toBe(1);
  });

  it("WRITE_TELEMETRY kuyruğu attempts:5 + backoff ile açılır", async () => {
    const mq = new PlatformMessageQueue(makeConnection());
    await mq.addJob(job("WRITE_TELEMETRY"));
    const opts = queueNamed(QUEUE_NAMES.WRITE_TELEMETRY).options
      .defaultJobOptions ?? {};
    expect(opts.attempts).toBe(5);
    expect(opts.backoff).toEqual({ type: "exponential", delay: 1000 });
  });

  it("her tip kendi seçenekleriyle açılır", async () => {
    const mq = new PlatformMessageQueue(makeConnection());
    await Promise.all(ALL_TYPES.map((t) => mq.addJob(job(t))));
    for (const type of ALL_TYPES) {
      const expected = JOB_RETRY_OPTIONS[type].attempts;
      expect(attemptsFor(QUEUE_NAMES[type])).toBe(expected);
    }
  });
});

describe("PlatformMessageQueue config enjeksiyonu", () => {
  it("queueNames override: Queue + QueueEvents + Worker özel adla açılır", async () => {
    const mq = new PlatformMessageQueue(makeConnection(), {
      queueNames: { READ_DEVICE: "my_read_queue" },
    });
    await mq.addJob(job("READ_DEVICE"));
    await mq.registerWorkerFor("READ_DEVICE", async () => undefined);

    expect(queueNamed("my_read_queue")).toBeDefined();
    expect(queueEventsMocks.some((e) => e.name === "my_read_queue")).toBe(true);
    expect(workerMocks.some((w) => w.name === "my_read_queue")).toBe(true);
    // override verilmeyen tipler varsayılan adı kullanır
    await mq.addJob(job("WRITE_TELEMETRY"));
    expect(queueNamed(QUEUE_NAMES.WRITE_TELEMETRY)).toBeDefined();
  });

  it("retryOptions override kuyruğa işlenir (tip başına TAM değiştirme)", async () => {
    const mq = new PlatformMessageQueue(makeConnection(), {
      retryOptions: { READ_DEVICE: { attempts: 9 } },
    });
    await mq.addJob(job("READ_DEVICE"));
    expect(attemptsFor(QUEUE_NAMES.READ_DEVICE)).toBe(9);
    // diğer tipler etkilenmez
    await mq.addJob(job("COMMAND_DEVICE"));
    expect(attemptsFor(QUEUE_NAMES.COMMAND_DEVICE)).toBe(3);
  });

  it("bilinmeyen JobType anahtarları yok sayılır", async () => {
    const mq = new PlatformMessageQueue(
      makeConnection(),
      { queueNames: { BILINMEYEN: "x" } as never },
    );
    await mq.addJob(job("READ_DEVICE"));
    expect(attemptsFor(QUEUE_NAMES.READ_DEVICE)).toBe(1);
  });
});

describe("PlatformMessageQueue yüzeyi (IMessageQueue)", () => {
  it("addJob delay seçeneğini iletir", async () => {
    const mq = new PlatformMessageQueue(makeConnection());
    await mq.addJob(job("READ_DEVICE"), { delay: 5000 });
    expect(queueNamed(QUEUE_NAMES.READ_DEVICE).add).toHaveBeenCalledWith(
      "READ_DEVICE",
      expect.any(Object),
      expect.objectContaining({ delay: 5000 }),
    );
  });

  it("executeAndWait: başarılı nesne sonucu döner", async () => {
    const mq = new PlatformMessageQueue(makeConnection());
    await mq.addJob(job("COMMAND_DEVICE"));
    queueNamed(QUEUE_NAMES.COMMAND_DEVICE).add.mockResolvedValueOnce({
      id: "j",
      waitUntilFinished: vi.fn().mockResolvedValue({
        success: true,
        validated: true,
      }),
    });

    await expect(
      mq.executeAndWait(job("COMMAND_DEVICE"), 5000),
    ).resolves.toEqual({ success: true, validated: true });
  });

  it("executeAndWait: nesne olmayan sonuç → { success: true }", async () => {
    const mq = new PlatformMessageQueue(makeConnection());
    await mq.addJob(job("COMMAND_DEVICE"));
    queueNamed(QUEUE_NAMES.COMMAND_DEVICE).add.mockResolvedValueOnce({
      id: "j",
      waitUntilFinished: vi.fn().mockResolvedValue("done"),
    });

    const result = await mq.executeAndWait(job("COMMAND_DEVICE"), 5000);
    expect(result).toEqual({ success: true });
  });

  it("executeAndWait: timeout/hatada → { success: false, reason }", async () => {
    const mq = new PlatformMessageQueue(makeConnection());
    await mq.addJob(job("COMMAND_DEVICE"));
    queueNamed(QUEUE_NAMES.COMMAND_DEVICE).add.mockResolvedValueOnce({
      id: "j",
      waitUntilFinished: vi.fn().mockRejectedValue(new Error("timeout")),
    });

    const result = await mq.executeAndWait(job("COMMAND_DEVICE"), 5000);
    expect(result.success).toBe(false);
    expect(result.reason).toContain("timeout");
  });

  it("addRepeatableJob: pattern + jobId formatı", async () => {
    const mq = new PlatformMessageQueue(makeConnection());
    await mq.addRepeatableJob("oku-bsc", job("READ_DEVICE"), "* * * * *");
    expect(queueNamed(QUEUE_NAMES.READ_DEVICE).add).toHaveBeenCalledWith(
      "oku-bsc",
      expect.any(Object),
      {
        repeat: { pattern: "* * * * *" },
        jobId: "READ_DEVICE-bsc-1-oku-bsc",
      },
    );
  });

  it("addRepeatableJobEvery: startDate'li ve startDate'siz", async () => {
    const mq = new PlatformMessageQueue(makeConnection());
    await mq.addRepeatableJobEvery("oku-bsc", job("READ_DEVICE"), 1000);
    expect(queueNamed(QUEUE_NAMES.READ_DEVICE).add).toHaveBeenCalledWith(
      "oku-bsc",
      expect.any(Object),
      {
        repeat: { every: 1000 },
        jobId: "READ_DEVICE-bsc-1-oku-bsc",
      },
    );

    const start = new Date("2026-01-01T00:00:00Z");
    await mq.addRepeatableJobEvery(
      "oku-bsc-2",
      job("READ_DEVICE"),
      2000,
      start,
    );
    expect(queueNamed(QUEUE_NAMES.READ_DEVICE).add).toHaveBeenCalledWith(
      "oku-bsc-2",
      expect.any(Object),
      {
        repeat: { every: 2000, startDate: start },
        jobId: "READ_DEVICE-bsc-1-oku-bsc-2",
      },
    );
  });

  it("registerWorkerFor: doğru ad + concurrency; onCompleted/onFailed bağlanır", async () => {
    const onCompleted = vi.fn();
    const onFailed = vi.fn();
    const processor = vi.fn().mockResolvedValue(undefined);
    const mq = new PlatformMessageQueue(makeConnection());
    await mq.registerWorkerFor("READ_DEVICE", processor, {
      concurrency: 3,
      onCompleted,
      onFailed,
    });

    const worker = workerMocks[0]!;
    expect(worker.name).toBe(QUEUE_NAMES.READ_DEVICE);
    expect(worker.options.concurrency).toBe(3);

    const jobData = job("READ_DEVICE");
    worker.handlers["completed"]!({ data: jobData });
    expect(onCompleted).toHaveBeenCalledWith(jobData);

    worker.handlers["failed"]!({ data: jobData }, new Error("x"));
    expect(onFailed).toHaveBeenCalledWith(jobData, expect.any(Error));

    await worker.processor({ data: jobData });
    expect(processor).toHaveBeenCalledWith(jobData);
  });

  it("registerWorker: 6 tip için worker kurulur", async () => {
    const mq = new PlatformMessageQueue(makeConnection());
    await mq.registerWorker(async () => undefined);
    expect(workerMocks).toHaveLength(6);
    expect(workerMocks.map((w) => w.name)).toEqual(
      ALL_TYPES.map((t) => QUEUE_NAMES[t]),
    );
  });

  it("worker error eventi konsola yazılır", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const mq = new PlatformMessageQueue(makeConnection());
    await mq.registerWorkerFor("READ_DEVICE", async () => undefined);
    workerMocks[0]!.handlers["error"]!(new Error("worker-hatasi"));
    expect(errorSpy).toHaveBeenCalledWith(
      "[BullMQ] Worker error for queue_read_device:",
      expect.any(Error),
    );
  });

  it("queueStatus: kuyruklar JobType adıyla döner", async () => {
    const mq = new PlatformMessageQueue(makeConnection());
    await mq.addJob(job("READ_DEVICE"));
    await mq.addJob(job("WRITE_TELEMETRY"));

    queueNamed(QUEUE_NAMES.READ_DEVICE).getWaitingCount.mockResolvedValue(4);
    queueNamed(QUEUE_NAMES.READ_DEVICE).getActiveCount.mockResolvedValue(1);
    queueNamed(QUEUE_NAMES.WRITE_TELEMETRY).getFailedCount.mockResolvedValue(2);

    const status = await mq.queueStatus();
    const read = status.find((s) => s.name === "READ_DEVICE")!;
    expect(read.waiting).toBe(4);
    expect(read.active).toBe(1);
    const write = status.find((s) => s.name === "WRITE_TELEMETRY")!;
    expect(write.failed).toBe(2);
  });

  it("queueStatus: reddedilen sayaç 0 sayılır (allSettled — kademeli bozulma)", async () => {
    const mq = new PlatformMessageQueue(makeConnection());
    await mq.addJob(job("READ_DEVICE"));
    const q = queueNamed(QUEUE_NAMES.READ_DEVICE);
    q.getWaitingCount.mockRejectedValue(new Error("redis down"));
    q.getActiveCount.mockResolvedValue(7);

    const status = await mq.queueStatus();
    expect(status[0]?.name).toBe("READ_DEVICE");
    expect(status[0]?.waiting).toBe(0);
    expect(status[0]?.active).toBe(7);
  });

  it("queueStats: bilinen tip durum döner, bilinmeyen tip null", async () => {
    const mq = new PlatformMessageQueue(makeConnection());
    await mq.addJob(job("READ_DEVICE"));
    queueNamed(QUEUE_NAMES.READ_DEVICE).getWaitingCount.mockResolvedValue(3);

    const stats = await mq.queueStats("READ_DEVICE");
    expect(stats?.name).toBe("READ_DEVICE");
    expect(stats?.waiting).toBe(3);

    await expect(mq.queueStats("COMMAND_DEVICE")).resolves.toBeNull();
  });

  it("health: ping false → false", async () => {
    const mq = new PlatformMessageQueue(
      makeConnection({ ping: vi.fn().mockResolvedValue(false) }),
    );
    await expect(mq.health()).resolves.toBe(false);
  });

  it("health: ping true + READ_DEVICE kuyruğu → true", async () => {
    const mq = new PlatformMessageQueue(makeConnection());
    await mq.addJob(job("READ_DEVICE"));
    await expect(mq.health()).resolves.toBe(true);
  });

  it("health: ping true + kuyruk yok → true", async () => {
    const mq = new PlatformMessageQueue(makeConnection());
    await expect(mq.health()).resolves.toBe(true);
  });

  it("health: getJobCounts hatası → false", async () => {
    const mq = new PlatformMessageQueue(makeConnection());
    await mq.addJob(job("READ_DEVICE"));
    queueNamed(QUEUE_NAMES.READ_DEVICE).getJobCounts.mockRejectedValue(
      new Error("redis down"),
    );
    await expect(mq.health()).resolves.toBe(false);
  });

  it("close: tüm worker/queueEvents/queue close'ları çağrılır", async () => {
    const mq = new PlatformMessageQueue(makeConnection());
    await mq.addJob(job("READ_DEVICE"));
    await mq.registerWorkerFor("READ_DEVICE", async () => undefined);

    await mq.close();

    expect(workerMocks[0]!.close).toHaveBeenCalled();
    expect(queueEventsMocks[0]!.close).toHaveBeenCalled();
    expect(queueMocks[0]!.close).toHaveBeenCalled();
  });
});
