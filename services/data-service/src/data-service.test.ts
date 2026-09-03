import { describe, it, expect, vi, beforeEach } from "vitest";
import type { IMessageQueue, ITimeseriesDatabase, ISqlDatabase } from "@gd-monorepo/core";
import { TamperLogger } from "@gd-monorepo/tamper-logger";

import { DataService } from "./data-service";

/**
 * data-service sözleşmesi (Faz 0 T0.11):
 *
 * KARAKTERİZASYON (değişiklik öncesi, doğrulandı): telemetri akışının içinden
 * logType filtre edilip system_logs'a INSERT ediliyordu (telemetri ≠ log ihlali)
 * + Promise.allSettled ile sessiz yutma. T0.11 ile bu davranış BİLİNÇLİ kaldı:
 *
 * - Telemetri saf telemetridir — logType yoktur, system_logs'a yazım YOKTUR.
 * - write hatası: TransientError fırlatılır (retry: attempts 5 + dead-letter).
 * - Sınır logu: onFailed — tek log noktası, jobId + deviceId'ler bağlamda.
 * - Başarılı yazımlar asla loglanmaz.
 */

function mockQueue(overrides?: Partial<IMessageQueue>): IMessageQueue {
  return {
    addJob: vi.fn(),
    executeAndWait: vi.fn(),
    addRepeatableJob: vi.fn(),
    addRepeatableJobEvery: vi.fn(),
    registerWorker: vi.fn(),
    registerWorkerFor: vi.fn(),
    close: vi.fn(),
    queueStatus: vi.fn(),
    queueStats: vi.fn(),
    health: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
}

function mockTimescale(overrides?: Partial<ITimeseriesDatabase>): ITimeseriesDatabase {
  return {
    write: vi.fn().mockResolvedValue(undefined),
    query: vi.fn(),
    aggregate: vi.fn(),
    getDownsampledData: vi.fn(),
    getLatest: vi.fn(),
    getLatestN: vi.fn(),
    listDevices: vi.fn(),
    runRetention: vi.fn(),
    executeRaw: vi.fn(),
    close: vi.fn(),
    health: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
}

function mockSql(overrides?: Partial<ISqlDatabase>): ISqlDatabase {
  return {
    connect: vi.fn(),
    disconnect: vi.fn(),
    execute: vi.fn(),
    query: vi.fn(),
    queryOne: vi.fn(),
    health: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
}

describe("DataService", () => {
  let mq: IMessageQueue;
  let timescale: ITimeseriesDatabase;
  let sql: ISqlDatabase;
  let service: DataService;
  let workerProcessor: ((job: unknown) => Promise<unknown>) | undefined;
  let onFailedHandler: ((job: unknown, err: Error) => void) | undefined;

  beforeEach(() => {
    mq = mockQueue();
    timescale = mockTimescale();
    sql = mockSql();
    service = new DataService(mq, timescale, sql);

    // Capture the worker processor on registerWorkerFor
    (mq.registerWorkerFor as ReturnType<typeof vi.fn>).mockImplementation(
      (_type: string, processor: (job: unknown) => Promise<unknown>, options?: { onFailed?: (job: unknown, err: Error) => void }) => {
        workerProcessor = processor;
        onFailedHandler = options?.onFailed;
      },
    );
  });

  describe("start()", () => {
    it("registers WRITE_TELEMETRY worker with onFailed boundary", async () => {
      await service.start();
      expect(mq.registerWorkerFor).toHaveBeenCalledWith(
        "WRITE_TELEMETRY",
        expect.any(Function),
        expect.objectContaining({ concurrency: 10, onFailed: expect.any(Function) }),
      );
    });
  });

  describe("worker processing", () => {
    beforeEach(async () => {
      await service.start();
    });

    it("writes telemetry to timescale on WRITE_TELEMETRY job", async () => {
      const job = {
        type: "WRITE_TELEMETRY" as const,
        jobId: "w-1",
        telemetries: [
          {
            name: "Voltage",
            description: "Voltage reading",
            value: 230,
            unit: "V",
            timestamp: new Date().toISOString(),
            deviceId: "dev-1",
          },
        ],
      };

      await workerProcessor!(job);
      expect(timescale.write).toHaveBeenCalledWith(job.telemetries);
    });

    it("telemetri akışından system_logs'a YAZIM YOKTUR (Açık 2 kapanışı)", async () => {
      const job = {
        type: "WRITE_TELEMETRY" as const,
        jobId: "w-2",
        telemetries: [
          {
            name: "Temp",
            description: "High temperature",
            value: 85,
            unit: "C",
            timestamp: new Date().toISOString(),
            deviceId: "dev-1",
          },
        ],
      };

      await workerProcessor!(job);
      expect(sql.execute).not.toHaveBeenCalled();
    });

    it("write hatası → TransientError fırlatılır (retry tetiklenir)", async () => {
      (timescale.write as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("connection lost"),
      );
      const job = {
        type: "WRITE_TELEMETRY" as const,
        jobId: "w-3",
        telemetries: [
          {
            name: "Voltage",
            description: "d",
            value: 230,
            unit: "V",
            timestamp: new Date().toISOString(),
            deviceId: "dev-1",
          },
        ],
      };

      await expect(workerProcessor!(job)).rejects.toThrow();
    });

    it("skips processing when service is stopped", async () => {
      await service.stop();
      const job = {
        type: "WRITE_TELEMETRY" as const,
        jobId: "w-4",
        telemetries: [],
      };

      await workerProcessor!(job!);
      expect(timescale.write).not.toHaveBeenCalled();
    });
  });

  describe("onFailed sınır logu (T0.7/T0.11)", () => {
    it("denemeler tükenince jobId + deviceId'lerle loglanır", async () => {
      const log = vi.fn().mockResolvedValue(undefined);
      service = new DataService(mq, timescale, sql, { log } as unknown as TamperLogger);
      (mq.registerWorkerFor as ReturnType<typeof vi.fn>).mockImplementation(
        (_type: string, processor: (job: unknown) => Promise<unknown>, options?: { onFailed?: (job: unknown, err: Error) => void }) => {
          workerProcessor = processor;
          onFailedHandler = options?.onFailed;
        },
      );
      await service.start();

      const job = {
        type: "WRITE_TELEMETRY" as const,
        jobId: "w-9",
        telemetries: [
          {
            name: "Voltage",
            description: "d",
            value: 230,
            unit: "V",
            timestamp: new Date().toISOString(),
            deviceId: "dev-1",
          },
          {
            name: "Current",
            description: "d",
            value: 10,
            unit: "A",
            timestamp: new Date().toISOString(),
            deviceId: "dev-1",
          },
        ],
      };

      onFailedHandler!(job, new Error("final failure"));
      expect(log).toHaveBeenCalledTimes(1);
      const input = log.mock.calls[0][0];
      expect(input.eventCode).toBe("telemetry_write_failed");
      expect(input.level).toBe("error");
      expect(input.category).toBe("app");
      expect(input.context.jobId).toBe("w-9");
      expect(input.context.deviceIds).toEqual(["dev-1"]);
    });

    it("logger yoksa onFailed sessizdir (geriye uyumluluk)", async () => {
      onFailedHandler!(
        { jobId: "x", type: "WRITE_TELEMETRY", telemetries: [] },
        new Error("x"),
      );
      // fırlatmaz
    });
  });

  describe("stop()", () => {
    it("closes all connections", async () => {
      await service.stop();
      expect(mq.close).toHaveBeenCalled();
      expect(timescale.close).toHaveBeenCalled();
      expect(sql.disconnect).toHaveBeenCalled();
    });
  });

  describe("health()", () => {
    it("returns false when stopped", async () => {
      expect(await service.health()).toBe(false);
    });

    it("returns true when all services healthy", async () => {
      await service.start();
      expect(await service.health()).toBe(true);
    });

    it("returns false when message queue is unhealthy", async () => {
      (mq.health as ReturnType<typeof vi.fn>).mockResolvedValue(false);
      await service.start();
      expect(await service.health()).toBe(false);
    });

    it("returns false when timescale is unhealthy", async () => {
      (timescale.health as ReturnType<typeof vi.fn>).mockResolvedValue(false);
      await service.start();
      expect(await service.health()).toBe(false);
    });

    it("returns false on exception", async () => {
      (mq.health as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("boom"));
      await service.start();
      expect(await service.health()).toBe(false);
    });
  });
});
