import { describe, it, expect, vi, beforeEach } from "vitest";
import type { IMessageQueue, ITimeseriesDatabase, ISqlDatabase } from "@gd-monorepo/core";
import { DataService } from "./data-service";

function mockQueue(overrides?: Partial<IMessageQueue>): IMessageQueue {
  return {
    addJob: vi.fn(),
    executeAndWait: vi.fn(),
    addRepeatableJob: vi.fn(),
    addRepeatableJobEvery: vi.fn(),
    registerWorker: vi.fn(),
    registerWorkerFor: vi.fn(),
    close: vi.fn(),
    getQueueStatus: vi.fn(),
    getQueueStats: vi.fn(),
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

  beforeEach(() => {
    mq = mockQueue();
    timescale = mockTimescale();
    sql = mockSql();
    service = new DataService(mq, timescale, sql);

    // Capture the worker processor on registerWorkerFor
    (mq.registerWorkerFor as ReturnType<typeof vi.fn>).mockImplementation(
      (_type: string, processor: (job: unknown) => Promise<unknown>) => {
        workerProcessor = processor;
      },
    );
  });

  describe("start()", () => {
    it("registers WRITE_TELEMETRY worker", async () => {
      await service.start();
      expect(mq.registerWorkerFor).toHaveBeenCalledWith(
        "WRITE_TELEMETRY",
        expect.any(Function),
        { concurrency: 10 },
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

    it("inserts log entries for telemetry with logType", async () => {
      const job = {
        type: "WRITE_TELEMETRY" as const,
        telemetries: [
          {
            name: "Temp",
            description: "High temperature",
            value: 85,
            unit: "C",
            timestamp: new Date().toISOString(),
            deviceId: "dev-1",
            logType: "warning" as const,
          },
        ],
      };

      await workerProcessor!(job);
      expect(sql.execute).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO system_logs"),
        ["warning", "system", "dev-1: Temp", "High temperature | value=85"],
      );
    });

    it("does not insert logs when logType is absent", async () => {
      const job = {
        type: "WRITE_TELEMETRY" as const,
        telemetries: [
          {
            name: "Voltage",
            description: "Normal",
            value: 230,
            unit: "V",
            timestamp: new Date().toISOString(),
            deviceId: "dev-1",
          },
        ],
      };

      await workerProcessor!(job);
      expect(sql.execute).not.toHaveBeenCalled();
    });

    it("skips processing when service is stopped", async () => {
      await service.stop();
      const job = {
        type: "WRITE_TELEMETRY" as const,
        telemetries: [],
      };

      await workerProcessor!(job!);
      expect(timescale.write).not.toHaveBeenCalled();
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
