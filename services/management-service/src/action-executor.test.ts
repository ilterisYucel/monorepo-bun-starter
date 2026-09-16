import { describe, it, expect, vi } from "vitest";
import { ActionExecutor } from "./action-executor";
import type { IMessageQueue } from "@gd-monorepo/core";
import type { TamperLogger } from "@gd-monorepo/tamper-logger";
import type { IDeviceConfigSource } from "@gd-monorepo/platform-commands";
import { CommandJobBuilder } from "@gd-monorepo/platform-commands";
import type { AutomationRule, DeviceConfigFile } from "@gd-monorepo/shared-types";

/**
 * ActionExecutor sözleşmesi (MANAGEMENT-SERVICE-MIMARISI.md §7, T5):
 *
 * - Kural ateşlendiğinde önce `auto_rule_fired` (info, context.rule) loglanır.
 * - Aksiyonlar SIRAYLA çalışır; biri başarısız olursa sonrakiler DEVAM eder
 *   (kademeli bozulma) — sonuç listesi her aksiyonun ok/fail durumunu taşır.
 * - command: config çözümleme hatası (beklenen) → fail; job → executeAndWait
 *   (timeout = validate.timeoutMs ?? 3000 + 2000 tampon) → success ise
 *   `auto_rule_action_ok`, değilse `auto_rule_action_failed` (error).
 * - log: eventCode yoksa `auto_rule_fired`; logger yoksa console fallback;
 *   logger hatası → aksiyon fail (sonraki devam eder).
 * - notify: notifier yoksa ATLANIR (ok sonucu); AlertNotifier sink hatası →
 *   fail + `auto_rule_action_failed`.
 * - Beklenmeyen throw (builder/mq) → fail sonucuna düşer, akış durmaz.
 * - Yan etki: log/bildirim/job — testlerde hepsi enjekte edilir.
 */

function mockMq(overrides: Partial<IMessageQueue> = {}): IMessageQueue {
  return {
    addJob: vi.fn().mockResolvedValue(undefined),
    executeAndWait: vi.fn().mockResolvedValue({ success: true }),
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

const bscConfig: DeviceConfigFile = {
  deviceId: "bsc-1",
  name: "BSC 1",
  manufacturer: "LG",
  model: "BSC",
  protocol: "MODBUS",
  connection: {},
  telemetry: [],
  commands: {
    stop: {
      telemetries: [{ name: "Request", value: 1 }],
      atomic: true,
      timeoutMs: 2000,
      validate: {
        reads: [{ name: "Request", expect: 1 }],
      },
    },
    charge: {
      telemetries: [{ name: "Power", value: "{{powerKw}}" }],
      params: { powerKw: { type: "number", required: true } },
    },
  },
};

function fakeLogger(): { logger: TamperLogger; log: ReturnType<typeof vi.fn> } {
  const log = vi.fn().mockResolvedValue(undefined);
  return { logger: { log } as unknown as TamperLogger, log };
}

function executor(
  overrides: Partial<{
    mq: IMessageQueue;
    logger: TamperLogger;
    source: IDeviceConfigSource;
    containerCommands?: import("./container-command-channel").IContainerCommandChannel;
  }> = {},
): ActionExecutor {
  const source: IDeviceConfigSource = overrides.source ?? {
    load: (id: string) => (id === "bsc-1" ? bscConfig : undefined),
  };
  return new ActionExecutor({
    builder: new CommandJobBuilder({ source }),
    mq: overrides.mq ?? mockMq(),
    logger: overrides.logger,
    ...(overrides.containerCommands
      ? { containerCommands: overrides.containerCommands }
      : {}),
  });
}

function rule(overrides: Partial<AutomationRule>): AutomationRule {
  return {
    name: "high-soc-stop",
    when: { all: [{ telemetry: "soc", op: "gt", threshold: 90 }] },
    then: [{ action: "notify" }],
    ...overrides,
  };
}

describe("ActionExecutor", () => {
  it("kural ateşleme logu: auto_rule_fired (info, context.rule)", async () => {
    const { logger, log } = fakeLogger();
    const ex = executor({ logger });
    await ex.execute(rule({}));
    const fired = log.mock.calls
      .map((c) => c[0])
      .find((e: { eventCode: string }) => e.eventCode === "auto_rule_fired");
    expect(fired).toBeDefined();
    expect(fired.category).toBe("app");
    expect(fired.context.rule).toBe("high-soc-stop");
  });

  it("command aksiyonu başarı → executeAndWait + auto_rule_action_ok", async () => {
    const mq = mockMq();
    const { logger, log } = fakeLogger();
    const ex = executor({ mq, logger });
    const outcomes = await ex.execute(
      rule({ then: [{ action: "command", deviceId: "bsc-1", command: "stop" }] }),
    );
    expect(mq.executeAndWait).toHaveBeenCalledTimes(1);
    const job = vi.mocked(mq.executeAndWait).mock.calls[0]![0] as {
      deviceId: string;
      type: string;
    };
    expect(job.deviceId).toBe("bsc-1");
    expect(job.type).toBe("COMMAND_DEVICE");
    // timeout = 2000 (config validate.timeoutMs) + 2000 tampon
    expect(vi.mocked(mq.executeAndWait).mock.calls[0]![1]).toBe(4000);
    expect(outcomes[0]!.ok).toBe(true);
    const ok = log.mock.calls
      .map((c) => c[0])
      .find((e: { eventCode: string }) => e.eventCode === "auto_rule_action_ok");
    expect(ok).toBeDefined();
    expect(ok.context.command).toBe("stop");
  });

  it("validate olmayan komutta timeout varsayılan 3000 + tampon", async () => {
    const mq = mockMq();
    const { logger } = fakeLogger();
    const ex = executor({ mq, logger });
    await ex.execute(
      rule({
        then: [
          {
            action: "command",
            deviceId: "bsc-1",
            command: "charge",
            params: { powerKw: 10 },
          },
        ],
      }),
    );
    expect(vi.mocked(mq.executeAndWait).mock.calls[0]![1]).toBe(5000);
  });

  it("command aksiyonu job başarısız → auto_rule_action_failed", async () => {
    const mq = mockMq({
      executeAndWait: vi.fn().mockResolvedValue({ success: false, reason: "timeout" }),
    });
    const { logger, log } = fakeLogger();
    const ex = executor({ mq, logger });
    const outcomes = await ex.execute(
      rule({ then: [{ action: "command", deviceId: "bsc-1", command: "stop" }] }),
    );
    expect(outcomes[0]!.ok).toBe(false);
    const failed = log.mock.calls
      .map((c) => c[0])
      .find((e: { eventCode: string }) => e.eventCode === "auto_rule_action_failed");
    expect(failed).toBeDefined();
    expect(failed.context.reason).toBe("timeout");
  });

  it("command aksiyonu çözümleme hatası → fail (throw yok, akış durmaz)", async () => {
    const { logger, log } = fakeLogger();
    const ex = executor({ logger });
    const outcomes = await ex.execute(
      rule({
        then: [
          { action: "command", deviceId: "yok", command: "stop" },
          { action: "command", deviceId: "bsc-1", command: "stop" },
        ],
      }),
    );
    expect(outcomes[0]!.ok).toBe(false);
    expect(outcomes[0]!.reason).toContain("device_not_found");
    expect(outcomes[1]!.ok).toBe(true);
    expect(log.mock.calls.length).toBeGreaterThan(2);
  });

  it("zorunlu param eksik command → fail; sonraki aksiyon devam eder", async () => {
    const { logger } = fakeLogger();
    const ex = executor({ logger });
    const outcomes = await ex.execute(
      rule({
        then: [
          { action: "command", deviceId: "bsc-1", command: "charge" },
          { action: "notify" },
        ],
      }),
    );
    expect(outcomes[0]!.ok).toBe(false);
    expect(outcomes[0]!.reason).toContain("missing_param");
    expect(outcomes[1]!.ok).toBe(true);
  });

  it("log aksiyonu: config eventCode + level; logger yoksa console fallback", async () => {
    const { logger, log } = fakeLogger();
    const ex = executor({ logger });
    await ex.execute(
      rule({
        then: [{ action: "log", level: "warn", eventCode: "auto_rule_my_rule", message: "özel mesaj" }],
      }),
    );
    const custom = log.mock.calls
      .map((c) => c[0])
      .find((e: { eventCode: string }) => e.eventCode === "auto_rule_my_rule");
    expect(custom).toBeDefined();
    expect(custom.level).toBe("warn");
    expect(custom.message).toBe("özel mesaj");

    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const ex2 = executor({});
      const outcomes = await ex2.execute(
        rule({ then: [{ action: "log", level: "warn" }] }),
      );
      expect(outcomes[0]!.ok).toBe(true);
      expect(warn).toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });

  it("log aksiyonu logger hatası → fail; akış devam eder", async () => {
    const failingLogger = {
      log: vi.fn().mockRejectedValue(new Error("sink down")),
    } as unknown as TamperLogger;
    const ex = executor({ logger: failingLogger });
    const outcomes = await ex.execute(
      rule({
        then: [
          { action: "log", level: "info" },
          { action: "command", deviceId: "bsc-1", command: "stop" },
        ],
      }),
    );
    expect(outcomes[0]!.ok).toBe(false);
    expect(outcomes[1]!.ok).toBe(true);
  });

  it("container-command başarı → kanal trace'iyle çağrılır + auto_rule_action_ok", async () => {
    const { logger, log } = fakeLogger();
    const send = vi.fn().mockResolvedValue({ ok: true, traceId: "auto:r" });
    const ex = executor({ logger, containerCommands: { send } });
    const outcomes = await ex.execute(
      rule({
        then: [
          {
            action: "container-command",
            containerId: "c-1",
            deviceId: "BSC-1",
            command: "stop",
          },
        ],
      }),
    );
    expect(outcomes[0]!.ok).toBe(true);
    expect(send).toHaveBeenCalledWith({
      containerId: "c-1",
      deviceId: "BSC-1",
      command: "stop",
      params: undefined,
      traceId: "auto:high-soc-stop",
    });
    expect(
      log.mock.calls
        .map((c) => c[0])
        .some((e: { eventCode: string }) => e.eventCode === "auto_rule_action_ok"),
    ).toBe(true);
  });

  it("container-command kanal fail → auto_rule_action_failed (akış durmaz)", async () => {
    const { logger, log } = fakeLogger();
    const send = vi.fn().mockResolvedValue({ ok: false, reason: "Validation timeout", traceId: "auto:r" });
    const ex = executor({ logger, containerCommands: { send } });
    const outcomes = await ex.execute(
      rule({
        then: [
          { action: "container-command", containerId: "c-1", deviceId: "BSC-1", command: "stop" },
          { action: "notify" },
        ],
      }),
    );
    expect(outcomes[0]!.ok).toBe(false);
    expect(outcomes[0]!.reason).toBe("Validation timeout");
    expect(outcomes[1]!.ok).toBe(true);
    expect(
      log.mock.calls
        .map((c) => c[0])
        .some((e: { eventCode: string }) => e.eventCode === "auto_rule_action_failed"),
    ).toBe(true);
  });

  it("container-command kanal YOK → fail (kademeli bozulma)", async () => {
    const { logger } = fakeLogger();
    const ex = executor({ logger });
    const outcomes = await ex.execute(
      rule({
        then: [
          { action: "container-command", containerId: "c-1", deviceId: "BSC-1", command: "stop" },
        ],
      }),
    );
    expect(outcomes[0]!.ok).toBe(false);
    expect(outcomes[0]!.reason).toContain("kanal");
  });

  it("notify aksiyonu: eventCode auto_rule_<name> ile loglanır; başarı sonucu ok", async () => {
    const { logger, log } = fakeLogger();
    const ex = executor({ logger });
    const outcomes = await ex.execute(rule({ then: [{ action: "notify" }] }));
    expect(log).toHaveBeenCalled();
    const event = log.mock.calls
      .map((c) => c[0])
      .find((e: { eventCode: string }) => e.eventCode === "auto_rule_high-soc-stop");
    expect(event).toBeDefined();
    expect(event.level).toBe("warn");
    expect(outcomes[0]!.ok).toBe(true);
  });

  it("logger yoksa notify ATLANIR (ok sonuç)", async () => {
    const ex = executor({});
    const outcomes = await ex.execute(rule({ then: [{ action: "notify" }] }));
    expect(outcomes[0]!.ok).toBe(true);
    expect(outcomes[0]!.reason).toContain("logger yok");
  });

  it("notify logu hatası → fail sonucu (akış durmaz)", async () => {
    const failingLogger = {
      log: vi.fn().mockRejectedValue(new Error("sink down")),
    } as unknown as TamperLogger;
    const ex = executor({ logger: failingLogger });
    const outcomes = await ex.execute(
      rule({ then: [{ action: "notify" }, { action: "log", level: "info" }] }),
    );
    expect(outcomes[0]!.ok).toBe(false);
    expect(outcomes[1]!.ok).toBe(false);
  });

  it("beklenmeyen mq throw → fail sonucu, akış devam eder", async () => {
    const mq = mockMq({
      executeAndWait: vi.fn().mockRejectedValue(new Error("redis down")),
    });
    const { logger } = fakeLogger();
    const ex = executor({ mq, logger });
    const outcomes = await ex.execute(
      rule({
        then: [
          { action: "command", deviceId: "bsc-1", command: "stop" },
          { action: "notify" },
        ],
      }),
    );
    expect(outcomes[0]!.ok).toBe(false);
    expect(outcomes[1]!.ok).toBe(true);
  });

  it("sonuç logu hatası aksiyon sonucunu değiştirmez (best-effort)", async () => {
    const failingLogger = {
      log: vi.fn().mockRejectedValue(new Error("sink down")),
    } as unknown as TamperLogger;
    const ex = executor({ logger: failingLogger });
    const outcomes = await ex.execute(
      rule({ then: [{ action: "command", deviceId: "bsc-1", command: "stop" }] }),
    );
    expect(outcomes[0]!.ok).toBe(true);
  });

  it("logger yoksa log aksiyonu console fallback: error ve info seviyeleri", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    try {
      const ex = executor({});
      const outcomes = await ex.execute(
        rule({
          then: [
            { action: "log", level: "error" },
            { action: "log", level: "info" },
          ],
        }),
      );
      expect(outcomes[0]!.ok).toBe(true);
      expect(outcomes[1]!.ok).toBe(true);
      expect(errSpy).toHaveBeenCalled();
      expect(infoSpy).toHaveBeenCalled();
    } finally {
      errSpy.mockRestore();
      infoSpy.mockRestore();
    }
  });

  it("sonuç listesi aksiyon sırasını korur", async () => {
    const { logger } = fakeLogger();
    const ex = executor({ logger });
    const outcomes = await ex.execute(
      rule({
        then: [
          { action: "command", deviceId: "bsc-1", command: "stop" },
          { action: "log", level: "info" },
          { action: "notify" },
        ],
      }),
    );
    expect(outcomes.map((o) => o.action.action)).toEqual([
      "command",
      "log",
      "notify",
    ]);
  });
});
