import { describe, it, expect, vi, beforeEach } from "vitest";
import type { IMessageQueue } from "@gd-monorepo/core";
import type { ServiceConfigFile } from "@gd-monorepo/shared-types";
import { DeviceScheduler } from "./device-scheduler";

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
    health: vi.fn(),
    ...overrides,
  };
}

const defaultConfig: ServiceConfigFile = {
  redis: { host: "localhost", port: 6379 },
};

describe("DeviceScheduler", () => {
  let mq: IMessageQueue;
  let scheduler: DeviceScheduler;

  beforeEach(() => {
    mq = mockQueue();
    scheduler = new DeviceScheduler(mq, defaultConfig);
  });

  describe("scheduleRead()", () => {
    it("creates repeatable job with correct name and interval", async () => {
      await scheduler.scheduleRead("bsc-1", 5000);
      expect(mq.addRepeatableJobEvery).toHaveBeenCalledWith(
        "read-bsc-1",
        expect.objectContaining({
          type: "READ_DEVICE",
          deviceId: "bsc-1",
        }),
        5000,
      );
    });

    it("uses deviceId in job name", async () => {
      await scheduler.scheduleRead("hvac-3", 3000);
      const call = (mq.addRepeatableJobEvery as ReturnType<typeof vi.fn>).mock
        .calls[0]!;
      expect(call[0]).toBe("read-hvac-3");
    });
  });

  describe("scheduleManagement()", () => {
    it("creates management job with default interval", async () => {
      await scheduler.scheduleManagement();
      expect(mq.addRepeatableJobEvery).toHaveBeenCalledWith(
        "management-publish",
        expect.objectContaining({
          type: "MANAGEMENT",
          deviceId: "device-service",
        }),
        10000,
      );
    });

    it("uses configured managementIntervalMs", async () => {
      const configWithInterval: ServiceConfigFile = {
        ...defaultConfig,
        managementIntervalMs: 60000,
      };
      const s = new DeviceScheduler(mq, configWithInterval);
      await s.scheduleManagement();
      expect(mq.addRepeatableJobEvery).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        60000,
      );
    });
  });

  describe("publishTelemetry()", () => {
    it("adds job when telemetry data is provided", async () => {
      const data = [
        {
          name: "Voltage",
          description: "V",
          value: 230,
          unit: "V",
          timestamp: new Date().toISOString(),
          deviceId: "dev-1",
        },
      ];
      await scheduler.publishTelemetry("dev-1", data);
      expect(mq.addJob).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "WRITE_TELEMETRY",
          deviceId: "dev-1",
          telemetries: data,
        }),
      );
    });

    it("skips when telemetry data is empty", async () => {
      await scheduler.publishTelemetry("dev-1", []);
      expect(mq.addJob).not.toHaveBeenCalled();
    });
  });
});
