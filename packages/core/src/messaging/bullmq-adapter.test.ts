import { describe, it, expect, vi, beforeEach } from "vitest";
import type { RedisConnection } from "./redis";

/**
 * BullMQAdapter JENERİK sözleşmesi (platform-bağımsız):
 * - JobType/kuyruk adı/retry politikası BİLMEZ — kuyruklar adla açılır.
 * - openQueue: lazy + önbellekli (aynı ad tek Queue örneği); retryOptions
 *   kuyruğa işlenir; QueueEvents "failed" handler'ı kurulur.
 * - BullMQQueue facade: add (jobId/delay/priority), addRepeatable (every +
 *   startDate), addRepeatablePattern (pattern), executeAndWait (nesne sonuç
 *   spread edilir / nesne-olmayan → {success:true} / hata → {success:false}),
 *   registerWorker (ad + concurrency + onCompleted/onFailed/error),
 *   stats (reddedilen sayaç 0 — allSettled), jobCounts, close.
 * - adapter.queueStatus: açık TÜM kuyruklar (name = kuyruk adı).
 * - adapter.health: yalnızca redis ping; hata → false (throw yok).
 * - adapter.close: tüm worker + QueueEvents + Queue close'ları.
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

import { BullMQAdapter } from "./bullmq-adapter";

function makeConnection(overrides: Partial<RedisConnection> = {}): RedisConnection {
  return {
    connectionConfig: () => ({ host: "localhost", port: 6379 }),
    ping: vi.fn().mockResolvedValue(true),
    connect: vi.fn(),
    disconnect: vi.fn(),
    ...overrides,
  } as unknown as RedisConnection;
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

describe("BullMQAdapter openQueue (jenerik)", () => {
  it("kuyruk + QueueEvents kurulur; retryOptions işlenir", async () => {
    const adapter = new BullMQAdapter(makeConnection());
    await adapter.openQueue("benim_kuyruk", {
      retryOptions: { attempts: 7 },
    });

    expect(queueNamed("benim_kuyruk")).toBeDefined();
    expect(queueNamed("benim_kuyruk").options.defaultJobOptions).toEqual({
      attempts: 7,
    });
    expect(queueEventsMocks.some((e) => e.name === "benim_kuyruk")).toBe(true);
  });

  it("aynı ad iki kez açılırsa tek Queue örneği döner (önbellek)", async () => {
    const adapter = new BullMQAdapter(makeConnection());
    const first = await adapter.openQueue("tek_kuyruk");
    const second = await adapter.openQueue("tek_kuyruk");

    expect(first).toBe(second);
    expect(queueMocks).toHaveLength(1);
  });

  it("QueueEvents failed handler'ı konsola yazılır", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const adapter = new BullMQAdapter(makeConnection());
    await adapter.openQueue("hata_kuyruk");

    const events = queueEventsMocks.find((e) => e.name === "hata_kuyruk")!;
    events.handlers["failed"]!({ jobId: "j-1", failedReason: "boom" });

    expect(errorSpy).toHaveBeenCalledWith("[BullMQ] Job failed: hata_kuyruk", {
      jobId: "j-1",
      reason: "boom",
    });
  });
});

describe("BullMQQueue facade (jenerik)", () => {
  it("add: jobName + data + jobId/delay/priority iletimi", async () => {
    const adapter = new BullMQAdapter(makeConnection());
    const queue = await adapter.openQueue("q1");

    await queue.add("islem", { deger: 1 }, {
      jobId: "j-9",
      delay: 5000,
      priority: 2,
    });

    expect(queueNamed("q1").add).toHaveBeenCalledWith(
      "islem",
      { deger: 1 },
      { jobId: "j-9", priority: 2, delay: 5000 },
    );
  });

  it("addRepeatable: every + startDate + jobId", async () => {
    const adapter = new BullMQAdapter(makeConnection());
    const queue = await adapter.openQueue("q2");
    const start = new Date("2026-01-01T00:00:00Z");

    await queue.addRepeatable("tekrar", { d: 1 }, 1000, {
      jobId: "r-1",
      startDate: start,
    });

    expect(queueNamed("q2").add).toHaveBeenCalledWith(
      "tekrar",
      { d: 1 },
      { repeat: { every: 1000, startDate: start }, jobId: "r-1" },
    );
  });

  it("addRepeatablePattern: pattern + jobId", async () => {
    const adapter = new BullMQAdapter(makeConnection());
    const queue = await adapter.openQueue("q3");

    await queue.addRepeatablePattern("cron-is", { d: 2 }, "* * * * *", {
      jobId: "c-1",
    });

    expect(queueNamed("q3").add).toHaveBeenCalledWith(
      "cron-is",
      { d: 2 },
      { repeat: { pattern: "* * * * *" }, jobId: "c-1" },
    );
  });

  it("executeAndWait: nesne sonuç spread edilir (success:true varsayılan)", async () => {
    const adapter = new BullMQAdapter(makeConnection());
    const queue = await adapter.openQueue("q4");
    queueNamed("q4").add.mockResolvedValueOnce({
      id: "j",
      waitUntilFinished: vi.fn().mockResolvedValue({
        success: true,
        validated: true,
        data: { ok: 1 },
      }),
    });

    const result = await queue.executeAndWait("komut", { d: 3 }, 5000);
    expect(result).toEqual({ success: true, validated: true, data: { ok: 1 } });
  });

  it("executeAndWait: worker success:false sonucu EZER", async () => {
    const adapter = new BullMQAdapter(makeConnection());
    const queue = await adapter.openQueue("q5");
    queueNamed("q5").add.mockResolvedValueOnce({
      id: "j",
      waitUntilFinished: vi.fn().mockResolvedValue({ success: false }),
    });

    const result = await queue.executeAndWait("komut", {}, 5000);
    expect(result).toEqual({ success: false });
  });

  it("executeAndWait: nesne olmayan sonuç → { success: true }", async () => {
    const adapter = new BullMQAdapter(makeConnection());
    const queue = await adapter.openQueue("q6");
    queueNamed("q6").add.mockResolvedValueOnce({
      id: "j",
      waitUntilFinished: vi.fn().mockResolvedValue("done"),
    });

    const result = await queue.executeAndWait("komut", {}, 5000);
    expect(result).toEqual({ success: true });
  });

  it("executeAndWait: timeout/hatada → { success: false, reason }", async () => {
    const adapter = new BullMQAdapter(makeConnection());
    const queue = await adapter.openQueue("q7");
    queueNamed("q7").add.mockResolvedValueOnce({
      id: "j",
      waitUntilFinished: vi.fn().mockRejectedValue(new Error("timeout")),
    });

    const result = await queue.executeAndWait("komut", {}, 5000);
    expect(result.success).toBe(false);
    expect(result.reason).toContain("timeout");
  });

  it("registerWorker: doğru ad + concurrency; onCompleted/onFailed bağlanır", async () => {
    const onCompleted = vi.fn();
    const onFailed = vi.fn();
    const processor = vi.fn().mockResolvedValue(undefined);
    const adapter = new BullMQAdapter(makeConnection());
    const queue = await adapter.openQueue("q8");

    await queue.registerWorker(processor, {
      concurrency: 3,
      onCompleted,
      onFailed,
    });

    const worker = workerMocks[0]!;
    expect(worker.name).toBe("q8");
    expect(worker.options.concurrency).toBe(3);

    const payload = { d: 42 };
    worker.handlers["completed"]!({ data: payload });
    expect(onCompleted).toHaveBeenCalledWith(payload);

    worker.handlers["failed"]!({ data: payload }, new Error("x"));
    expect(onFailed).toHaveBeenCalledWith(payload, expect.any(Error));

    await worker.processor({ data: payload });
    expect(processor).toHaveBeenCalledWith(payload);
  });

  it("worker error eventi konsola yazılır", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const adapter = new BullMQAdapter(makeConnection());
    const queue = await adapter.openQueue("q9");
    await queue.registerWorker(async () => undefined);

    workerMocks[0]!.handlers["error"]!(new Error("worker-hatasi"));
    expect(errorSpy).toHaveBeenCalledWith(
      "[BullMQ] Worker error for q9:",
      expect.any(Error),
    );
  });

  it("stats: sayaçlar döner; reddedilen sayaç 0 sayılır", async () => {
    const adapter = new BullMQAdapter(makeConnection());
    const queue = await adapter.openQueue("q10");
    const q = queueNamed("q10");
    q.getWaitingCount.mockResolvedValue(4);
    q.getActiveCount.mockRejectedValue(new Error("redis down"));

    const stats = await queue.stats();
    expect(stats.name).toBe("q10");
    expect(stats.waiting).toBe(4);
    expect(stats.active).toBe(0);
  });

  it("jobCounts delegate eder", async () => {
    const adapter = new BullMQAdapter(makeConnection());
    const queue = await adapter.openQueue("q11");
    queueNamed("q11").getJobCounts.mockResolvedValue({ completed: 3 });

    await expect(queue.jobCounts()).resolves.toEqual({ completed: 3 });
  });
});

describe("BullMQAdapter queueStatus/health/close (jenerik)", () => {
  it("queueStatus: açık tüm kuyrukları kuyruk adıyla döner", async () => {
    const adapter = new BullMQAdapter(makeConnection());
    await adapter.openQueue("a_kuyruk");
    await adapter.openQueue("b_kuyruk");
    queueNamed("a_kuyruk").getWaitingCount.mockResolvedValue(2);

    const status = await adapter.queueStatus();
    expect(status.map((s) => s.name)).toEqual(["a_kuyruk", "b_kuyruk"]);
    expect(status[0]?.waiting).toBe(2);
  });

  it("health: ping false → false; ping true → true", async () => {
    const down = new BullMQAdapter(
      makeConnection({ ping: vi.fn().mockResolvedValue(false) }),
    );
    await expect(down.health()).resolves.toBe(false);

    const up = new BullMQAdapter(makeConnection());
    await expect(up.health()).resolves.toBe(true);
  });

  it("health: ping hatası → false (throw yok)", async () => {
    const adapter = new BullMQAdapter(
      makeConnection({ ping: vi.fn().mockRejectedValue(new Error("down")) }),
    );
    await expect(adapter.health()).resolves.toBe(false);
  });

  it("close: tüm worker + QueueEvents + Queue close'ları çağrılır", async () => {
    const adapter = new BullMQAdapter(makeConnection());
    const queue = await adapter.openQueue("kapanis");
    await queue.registerWorker(async () => undefined);
    await adapter.openQueue("kapanis2");

    await adapter.close();

    expect(workerMocks[0]!.close).toHaveBeenCalled();
    for (const qe of queueEventsMocks) {
      expect(qe.close).toHaveBeenCalled();
    }
    for (const q of queueMocks) {
      expect(q.close).toHaveBeenCalled();
    }
  });
});
