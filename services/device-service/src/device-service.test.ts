import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { DeviceService } from "./device-service";
import type { IDevice, ReadDeviceJob, CommandDeviceJob, DeviceAlarmRule } from "@gd-monorepo/shared-types";

import type { IMessageQueue, ISqlDatabase } from "@gd-monorepo/core";
import { TamperLogger } from "@gd-monorepo/tamper-logger";

import type { DeviceScheduler } from "./device-scheduler";
import type { SimulatorRegistry } from "./simulator-registry";

/**
 * device-service sözleşmesi (Faz 0 T0.11):
 *
 * KARAKTERİZASYON (değişiklik öncesi, doğrulandı — Açık 1): read() hatası
 * try/catch'siz processor'a SIZIYORDU; write hatası ham console.error'dı.
 * T0.11 ile bu davranış BİLİNÇLİ değişti:
 *
 * - read hatası: processor reject ETMEZ (poll devam, attempts:1); logger varsa
 *   online→offline GEÇİŞİNDE 1× error `modbus_read_failed` + `devices.status='offline'`;
 *   sürekli hatada 60 sn'de 1 debug; offline→online geçişinde 1× info
 *   `device_online` + status='online'.
 * - komut: write hatası → audit `command_rejected` + app `modbus_write_failed`;
 *   başarılı → audit `command_executed` (audit fail-closed — log hatası job'ı düşürür).
 * - Logger yoksa eski davranış korunur (geriye uyumluluk).
 */

function fakeDevice(overrides: Partial<IDevice> = {}): IDevice {
  return {
    id: "bsc-1",
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
    read: vi.fn().mockResolvedValue([
      {
        name: "Voltage",
        value: 220,
        timestamp: new Date().toISOString(),
        deviceId: "bsc-1",
        description: "Voltage reading",
        unit: "V",
      },
    ]),
    write: vi.fn().mockResolvedValue(undefined),
    writeAtomic: vi.fn(),
    ...overrides,
  };
}

function mockMq(capture: { processor?: (job: never) => Promise<unknown> }): IMessageQueue {
  return {
    addJob: vi.fn(),
    executeAndWait: vi.fn(),
    addRepeatableJob: vi.fn(),
    addRepeatableJobEvery: vi.fn(),
    registerWorker: vi.fn().mockImplementation((processor: (job: never) => Promise<unknown>) => {
      capture.processor = processor;
    }),
    registerWorkerFor: vi.fn(),
    close: vi.fn(),
    queueStatus: vi.fn(),
    queueStats: vi.fn(),
    health: vi.fn().mockResolvedValue(true),
  };
}

function mockScheduler(): DeviceScheduler {
  return {
    scheduleRead: vi.fn().mockResolvedValue(undefined),
    scheduleManagement: vi.fn().mockResolvedValue(undefined),
    publishTelemetry: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
  } as unknown as DeviceScheduler;
}

function mockSql(): ISqlDatabase {
  return {
    connect: vi.fn(),
    disconnect: vi.fn(),
    execute: vi.fn().mockResolvedValue(undefined),
    query: vi.fn(),
    queryOne: vi.fn(),
    health: vi.fn().mockResolvedValue(true),
  };
}

function mockLogger(): { logger: TamperLogger; log: ReturnType<typeof vi.fn> } {
  const log = vi.fn().mockResolvedValue(undefined);
  return { logger: { log } as unknown as TamperLogger, log };
}

function readJob(deviceId = "bsc-1"): ReadDeviceJob {
  return { jobId: "r-1", type: "READ_DEVICE", deviceId, timestamp: new Date().toISOString() };
}

function commandJob(overrides: Partial<CommandDeviceJob> = {}): CommandDeviceJob {
  return {
    jobId: "c-1",
    type: "COMMAND_DEVICE",
    deviceId: "bsc-1",
    timestamp: new Date().toISOString(),
    telemetries: [
      {
        name: "Power",
        value: 100,
        timestamp: new Date().toISOString(),
        deviceId: "bsc-1",
        description: "Güç",
        unit: "kW",
      },
    ],
    ...overrides,
  };
}

function buildService(
  device: IDevice,
  deps: { sql?: ISqlDatabase; logger?: TamperLogger; alarms?: DeviceAlarmRule[] } = {},
) {
  const capture: { processor?: (job: never) => Promise<unknown> } = {};
  const mq = mockMq(capture);
  const scheduler = mockScheduler();
  const service = new DeviceService(
    [{
      device,
      pollIntervalMs: 1000,
      name: "BSC 1",
      manufacturer: undefined,
      model: undefined,
      protocol: "modbus",
      type: "bsc",
      configConnection: {},
      alarms: deps.alarms,
    }],
    mq,
    scheduler,
    {} as SimulatorRegistry,
    deps.sql,
    undefined,
    deps.logger,
  );
  return { service, mq, scheduler, capture };
}

describe("device-service T0.11 sözleşmesi (hata yolları + log)", () => {
  let warn: ReturnType<typeof vi.spyOn>;
  let error: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    error = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-24T10:00:00Z"));
  });

  afterEach(() => {
    warn.mockRestore();
    error.mockRestore();
    vi.useRealTimers();
  });

  describe("readDevice hata yolu (Açık 1 kapanışı)", () => {
    it("read hatası processor'ı REJECT ETMEZ — poll devam eder", async () => {
      const device = fakeDevice({ read: vi.fn().mockRejectedValue(new Error("Modbus timeout")) });
      const { service, scheduler, capture } = buildService(device);
      await service.start();
      await expect(capture.processor!(readJob() as never)).resolves.toBeUndefined();
      expect(scheduler.publishTelemetry).not.toHaveBeenCalled();
    });

    it("online→offline geçişinde 1× error log + devices.status='offline'", async () => {
      const device = fakeDevice({ read: vi.fn().mockRejectedValue(new Error("timeout")) });
      const sql = mockSql();
      const { logger, log } = mockLogger();
      const { service, capture } = buildService(device, { sql, logger });
      await service.start();

      await capture.processor!(readJob() as never);

      expect(log).toHaveBeenCalledTimes(1);
      const input = log.mock.calls[0][0];
      expect(input.eventCode).toBe("modbus_read_failed");
      expect(input.level).toBe("error");
      expect(input.context.deviceId).toBe("bsc-1");
      expect(sql.execute).toHaveBeenCalledWith(
        expect.stringContaining("'offline'"),
        ["bsc-1"],
      );
    });

    it("sürekli hata 60 sn içinde yeni log üretmez (spam önleme)", async () => {
      const device = fakeDevice({ read: vi.fn().mockRejectedValue(new Error("timeout")) });
      const { logger, log } = mockLogger();
      const { service, capture } = buildService(device, { logger });
      await service.start();

      await capture.processor!(readJob() as never);
      await capture.processor!(readJob() as never);
      await capture.processor!(readJob() as never);
      expect(log).toHaveBeenCalledTimes(1);
    });

    it("60 sn sonra debug hatırlatma üretir", async () => {
      const device = fakeDevice({ read: vi.fn().mockRejectedValue(new Error("timeout")) });
      const { logger, log } = mockLogger();
      const { service, capture } = buildService(device, { logger });
      await service.start();

      await capture.processor!(readJob() as never);
      vi.advanceTimersByTime(60_001);
      await capture.processor!(readJob() as never);

      expect(log).toHaveBeenCalledTimes(2);
      expect(log.mock.calls[1][0].level).toBe("debug");
    });

    it("offline→online geçişinde info log + status='online'", async () => {
      const failing = fakeDevice({ read: vi.fn().mockRejectedValue(new Error("timeout")) });
      const sql = mockSql();
      const { logger, log } = mockLogger();
      const { service, capture } = buildService(failing, { sql, logger });
      await service.start();

      await capture.processor!(readJob() as never);
      expect(log).toHaveBeenCalledTimes(1);

      (failing.read as ReturnType<typeof vi.fn>).mockResolvedValue([
        { name: "Voltage", value: 220, timestamp: new Date().toISOString(), deviceId: "bsc-1", description: "d", unit: "V" },
      ]);
      await capture.processor!(readJob() as never);

      const onlineLog = log.mock.calls[1][0];
      expect(onlineLog.eventCode).toBe("device_online");
      expect(onlineLog.level).toBe("info");
      expect(sql.execute).toHaveBeenCalledWith(
        expect.stringContaining("'online'"),
        ["bsc-1"],
      );
    });

    it("logger yoksa eski davranış korunur (console.warn)", async () => {
      const { service, capture } = buildService(fakeDevice());
      await service.start();
      await capture.processor!(readJob("yok") as never);
      expect(warn).toHaveBeenCalled();
    });
  });

  describe("executeCommand audit (T0.11)", () => {
    it("write hatası → audit command_rejected + app modbus_write_failed", async () => {
      const device = fakeDevice({ write: vi.fn().mockRejectedValue(new Error("Write failed")) });
      const { logger, log } = mockLogger();
      const { service, capture } = buildService(device, { logger });
      await service.start();

      const result = await capture.processor!(commandJob() as never) as { success: boolean };
      expect(result.success).toBe(false);

      const events = log.mock.calls.map((c) => c[0]);
      const rejected = events.find((e: { eventCode: string }) => e.eventCode === "command_rejected");
      const writeFailed = events.find((e: { eventCode: string }) => e.eventCode === "modbus_write_failed");
      expect(rejected.category).toBe("audit");
      expect(rejected.context.deviceId).toBe("bsc-1");
      expect(rejected.context.telemetryNames).toEqual(["Power"]);
      expect(writeFailed.category).toBe("app");
      expect(error).not.toHaveBeenCalled();
    });

    it("başarılı yazma → audit command_executed", async () => {
      const device = fakeDevice();
      const { logger, log } = mockLogger();
      const { service, capture } = buildService(device, { logger });
      await service.start();

      const result = await capture.processor!(commandJob() as never) as { success: boolean };
      expect(result.success).toBe(true);

      const executed = log.mock.calls
        .map((c) => c[0])
        .find((e: { eventCode: string }) => e.eventCode === "command_executed");
      expect(executed).toBeDefined();
      expect(executed.category).toBe("audit");
    });

    it("audit fail-closed: command_rejected logu başarısızsa job düşer", async () => {
      const device = fakeDevice({ write: vi.fn().mockRejectedValue(new Error("Write failed")) });
      const log = vi.fn().mockRejectedValue(new Error("audit sink down"));
      const { service, capture } = buildService(device, {
        logger: { log } as unknown as TamperLogger,
      });
      await service.start();

      await expect(capture.processor!(commandJob() as never)).rejects.toThrow();
    });
  });

  describe("bilinmeyen cihaz", () => {
    it("logger varsa request_rejected loglanır, publish yok", async () => {
      const { logger, log } = mockLogger();
      const { service, scheduler, capture } = buildService(fakeDevice(), { logger });
      await service.start();
      await capture.processor!(readJob("yok") as never);
      expect(log).toHaveBeenCalledTimes(1);
      expect(log.mock.calls[0][0].eventCode).toBe("request_rejected");
      expect(scheduler.publishTelemetry).not.toHaveBeenCalled();
      expect(warn).not.toHaveBeenCalled();
    });
  });

  describe("cihaz alarm orkestrasyonu (Faz 0 eki)", () => {
    const ALARM_RULES: DeviceAlarmRule[] = [
      { telemetry: "BSC Fault", severity: "error", description: "BSC arızası" },
    ];

    function faultRead(value: number) {
      return fakeDevice({
        read: vi.fn().mockResolvedValue([
          {
            name: "BSC Fault",
            value,
            timestamp: new Date().toISOString(),
            deviceId: "bsc-1",
            description: "Arıza biti",
            unit: "-",
          },
        ]),
      });
    }

    it("yükselen kenar → activate UPSERT + tek device_alarm logu", async () => {
      const sql = mockSql();
      const { logger, log } = mockLogger();
      const { service, capture } = buildService(faultRead(1), {
        sql,
        logger,
        alarms: ALARM_RULES,
      });
      await service.start();

      await capture.processor!(readJob() as never);

      expect(sql.execute).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO device_alarms"),
        expect.any(Array),
      );
      const alarmLogs = log.mock.calls
        .map((c) => c[0])
        .filter((e: { eventCode: string }) => e.eventCode === "device_alarm");
      expect(alarmLogs).toHaveLength(1);
      expect(alarmLogs[0].level).toBe("error");
      expect(alarmLogs[0].context.alarm).toBe("BSC Fault");
    });

    it("aktifken tekrar eden okumalar SESSİZDİR (dedup)", async () => {
      const sql = mockSql();
      const { logger, log } = mockLogger();
      const { service, capture } = buildService(faultRead(1), {
        sql,
        logger,
        alarms: ALARM_RULES,
      });
      await service.start();

      await capture.processor!(readJob() as never);
      await capture.processor!(readJob() as never);
      await capture.processor!(readJob() as never);

      const alarmLogs = log.mock.calls.filter(
        (c) => c[0].eventCode === "device_alarm",
      );
      expect(alarmLogs).toHaveLength(1);
      const activates = (sql.execute as ReturnType<typeof vi.fn>).mock.calls.filter(
        (c) => String(c[0]).includes("INSERT INTO device_alarms"),
      );
      expect(activates).toHaveLength(1);
    });

    it("düşen kenar → deactivate + device_alarm_cleared logu", async () => {
      const sql = mockSql();
      const { logger, log } = mockLogger();
      const device = faultRead(1);
      const { service, capture } = buildService(device, {
        sql,
        logger,
        alarms: ALARM_RULES,
      });
      await service.start();

      await capture.processor!(readJob() as never);
      (device.read as ReturnType<typeof vi.fn>).mockResolvedValue([
        {
          name: "BSC Fault",
          value: 0,
          timestamp: new Date().toISOString(),
          deviceId: "bsc-1",
          description: "Arıza biti",
          unit: "-",
        },
      ]);
      await capture.processor!(readJob() as never);

      expect(sql.execute).toHaveBeenCalledWith(
        expect.stringContaining("SET active = FALSE"),
        ["bsc-1", "BSC Fault"],
      );
      const cleared = log.mock.calls
        .map((c) => c[0])
        .find((e: { eventCode: string }) => e.eventCode === "device_alarm_cleared");
      expect(cleared).toBeDefined();
      expect(cleared.level).toBe("info");
    });

    it("çözülme sonrası yeniden oluşum → yeniden tek log", async () => {
      const sql = mockSql();
      const { logger, log } = mockLogger();
      const device = faultRead(1);
      const { service, capture } = buildService(device, {
        sql,
        logger,
        alarms: ALARM_RULES,
      });
      await service.start();

      await capture.processor!(readJob() as never);
      (device.read as ReturnType<typeof vi.fn>).mockResolvedValue([
        { name: "BSC Fault", value: 0, timestamp: "t", deviceId: "bsc-1", description: "d", unit: "-" },
      ]);
      await capture.processor!(readJob() as never);
      (device.read as ReturnType<typeof vi.fn>).mockResolvedValue([
        { name: "BSC Fault", value: 1, timestamp: "t", deviceId: "bsc-1", description: "d", unit: "-" },
      ]);
      await capture.processor!(readJob() as never);

      const alarmLogs = log.mock.calls.filter(
        (c) => c[0].eventCode === "device_alarm",
      );
      expect(alarmLogs).toHaveLength(2);
    });

    it("logger yoksa durum tablosu yine çalışır", async () => {
      const sql = mockSql();
      const { service, capture } = buildService(faultRead(1), {
        sql,
        alarms: ALARM_RULES,
      });
      await service.start();
      await capture.processor!(readJob() as never);
      expect(sql.execute).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO device_alarms"),
        expect.any(Array),
      );
    });

    it("sql yoksa yalnızca log çalışır (tablo yazımı atlanır)", async () => {
      const { logger, log } = mockLogger();
      const { service, capture } = buildService(faultRead(1), {
        logger,
        alarms: ALARM_RULES,
      });
      await service.start();
      await capture.processor!(readJob() as never);
      expect(log.mock.calls.some((c) => c[0].eventCode === "device_alarm")).toBe(true);
    });

    it("alarm kuralları yoksa hiçbir alarm işlemi yapılmaz", async () => {
      const sql = mockSql();
      const { logger, log } = mockLogger();
      const { service, capture } = buildService(faultRead(1), { sql, logger });
      await service.start();
      await capture.processor!(readJob() as never);
      expect(log).not.toHaveBeenCalled();
      const alarmSql = (sql.execute as ReturnType<typeof vi.fn>).mock.calls.filter(
        (c) => String(c[0]).includes("device_alarms"),
      );
      // start() yalnızca DDL + resetAll çalıştırır — activate/deactivate YOK
      expect(
        (sql.execute as ReturnType<typeof vi.fn>).mock.calls.some((c) =>
          String(c[0]).includes("INSERT INTO device_alarms"),
        ),
      ).toBe(false);
      expect(alarmSql.length).toBeLessThanOrEqual(2);
    });

    it("start() restart sonrası bayat aktifleri kapatır + dedup sıfırlar", async () => {
      const sql = mockSql();
      const { logger, log } = mockLogger();
      const { service, capture } = buildService(faultRead(1), {
        sql,
        logger,
        alarms: ALARM_RULES,
      });
      await service.start();

      expect(sql.execute).toHaveBeenCalledWith(
        expect.stringContaining("SET active = FALSE"),
        [["bsc-1"]],
      );

      // start reset sonrası aktif koşul → yeni yükselen kenar (tek log)
      await capture.processor!(readJob() as never);
      const alarmLogs = log.mock.calls.filter(
        (c) => c[0].eventCode === "device_alarm",
      );
      expect(alarmLogs).toHaveLength(1);
    });
  });
});
