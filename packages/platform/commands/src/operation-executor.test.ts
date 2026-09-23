import { describe, it, expect, vi, beforeEach } from "vitest";
import type {
  CommandTimer,
  ManeuverRecord,
  OperationRecord,
} from "@gd-monorepo/shared-types";
import { ManeuverRegistry } from "./maneuver-registry";
import { OperationExecutor } from "./operation-executor";
import type {
  ICommandChannel,
  ICommandTargetResolver,
  IOperationRunStore,
  OperationRunDraft,
  ResolvedCommandStep,
  CommandStepResult,
} from "./operation-executor-contracts";

/**
 * OperationExecutor sözleşmesi (KOMUT-MANEVRA-OPERASYON §3-§8, B1):
 *
 * - Kayıt yok → rejected (kalıcılık ve kanal ÇALIŞMAZ).
 * - `runs.begin` FAIL-CLOSED: throw → rejected (run_persist_failed), yürütme
 *   başlamaz (§8).
 * - Adım çözümleme (§5.1): `deviceTypes` → online+müsait hedefler;
 *   `deviceIds` grup kısıtıyla KESİŞTİRİLİR; `deviceId` aynen; çözüm boş →
 *   adım BAŞARISIZ (kademeli bozulma).
 * - `{{divideTotal}}`: execute params değeri çözülen adım sayısına eşit
 *   bölünür (floor).
 * - mode/onFailure: sequential stop kalanları ATLAR; continue devam eder;
 *   rollback → başarılı adımların kompanzasyonu (ters sıra, best-effort),
 *   status rolled_back.
 * - Timer (§10): ana komut başarılıysa stopCommand delay ile planlanır
 *   (best-effort + audit); schedule hatası akışı DURDURMAZ.
 * - Operasyon: yerel manevra adımı + ham zincir adımı; UZAK adım (system)
 *   B1'de kanal YOK → fail (remote_channel_not_available — kademeli).
 * - `runs.finish` best-effort: throw → sonuç yine döner +
 *   operation_state_update_failed audit'i.
 */

function maneuver(overrides: Partial<ManeuverRecord> = {}): ManeuverRecord {
  return {
    name: "pcs_charge",
    label: "PCS Şarj",
    mode: "parallel",
    steps: [
      {
        deviceTypes: ["pcs"],
        command: "charge",
        params: { powerKw: "{{divideTotal}}" },
      },
    ],
    ...overrides,
  };
}

function operation(overrides: Partial<OperationRecord> = {}): OperationRecord {
  return {
    name: "field_charge",
    label: "Saha Şarj",
    mode: "sequential",
    onFailure: "rollback",
    steps: [
      { maneuver: "pcs_charge", params: { powerKw: 200 } },
      {
        commands: [{ deviceId: "PCS-9", command: "set_power_zero" }],
        mode: "parallel",
      },
    ],
    rollback: [{ maneuver: "pcs_stop" }],
    ...overrides,
  };
}

interface Harness {
  executor: OperationExecutor;
  channel: {
    execute: ReturnType<typeof vi.fn>;
    schedule: ReturnType<typeof vi.fn>;
  };
  targets: ReturnType<typeof vi.fn>;
  runs: {
    begin: ReturnType<typeof vi.fn>;
    finish: ReturnType<typeof vi.fn>;
  };
  log: ReturnType<typeof vi.fn>;
  begun: OperationRunDraft | undefined;
  finished: Array<{ id: string; status: string }>;
}

function harness(config: {
  maneuvers?: ManeuverRecord[];
  operations?: OperationRecord[];
} = {}): Harness {
  const registry = new ManeuverRegistry(config);
  const channelExecute = vi.fn(
    async (step: ResolvedCommandStep): Promise<CommandStepResult> => ({
      deviceId: step.deviceId,
      command: step.command,
      success: true,
    }),
  );
  const channelSchedule = vi.fn(async () => undefined);
  const targets = vi.fn(async (type: string) => ["PCS-1", "PCS-2"]);
  const begun: { run: OperationRunDraft | undefined } = { run: undefined };
  const finished: Array<{ id: string; status: string }> = [];
  const begin = vi.fn(async (run: OperationRunDraft) => {
    begun.run = run;
  });
  const finish = vi.fn(async (id: string, status: string) => {
    finished.push({ id, status });
  });
  const log = vi.fn(async () => undefined);

  const executor = new OperationExecutor({
    registry,
    targets: {
      resolveAvailable: targets,
      filterAvailable: async (ids: string[]) => ids,
    },
    channel: {
      execute: channelExecute,
      schedule: channelSchedule,
    } as ICommandChannel,
    runs: { begin, finish } as unknown as IOperationRunStore,
    logger: { log } as never,
    now: () => new Date("2026-09-22T10:00:00.000Z"),
    generateId: () => "run-1",
  });

  return {
    executor,
    channel: { execute: channelExecute, schedule: channelSchedule },
    targets,
    runs: { begin, finish },
    log,
    begun: begun.run,
    finished,
  };
}

function calledDevices(channel: { execute: ReturnType<typeof vi.fn> }): string[] {
  return channel.execute.mock.calls.map((c) => (c[0] as ResolvedCommandStep).deviceId);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("OperationExecutor — manevra yürütme", () => {
  it("kayıt yok → rejected; begin/kanal ÇALIŞMAZ", async () => {
    const h = harness();
    const result = await h.executor.execute("maneuver", "yok");
    expect(result.status).toBe("rejected");
    expect(result.reason).toBe("not_found");
    expect(h.runs.begin).not.toHaveBeenCalled();
    expect(h.channel.execute).not.toHaveBeenCalled();
  });

  it("deviceTypes çözümleme + divideTotal: 200 kW → 2 PCS × 100 kW", async () => {
    const h = harness({ maneuvers: [maneuver()] });
    const result = await h.executor.execute(
      "maneuver",
      "pcs_charge",
      { powerKw: 200 },
      { createdBy: "admin" },
    );
    expect(result.status).toBe("completed");
    expect(calledDevices(h.channel)).toEqual(["PCS-1", "PCS-2"]);
    const params = h.channel.execute.mock.calls.map(
      (c) => (c[0] as ResolvedCommandStep).params,
    );
    expect(params).toEqual([
      { powerKw: 100 },
      { powerKw: 100 },
    ]);
    expect(h.targets).toHaveBeenCalledWith("pcs");
  });

  it("grup kısıtı (deviceIds) seçici çözümünü KESER", async () => {
    const h = harness({ maneuvers: [maneuver()] });
    await h.executor.execute(
      "maneuver",
      "pcs_charge",
      { powerKw: 100 },
      { deviceIds: ["PCS-2"] },
    );
    expect(calledDevices(h.channel)).toEqual(["PCS-2"]);
    expect(h.channel.execute.mock.calls[0]![0].params).toEqual({ powerKw: 100 });
  });

  it("çözüm boş → adım başarısız → failed (kademeli bozulma)", async () => {
    const h = harness({ maneuvers: [maneuver()] });
    h.targets.mockResolvedValue([]);
    const result = await h.executor.execute("maneuver", "pcs_charge", {
      powerKw: 100,
    });
    expect(result.status).toBe("failed");
    expect(h.channel.execute).not.toHaveBeenCalled();
  });

  it("sequential + onFailure stop: ilk hata kalan adımları ATLAR", async () => {
    const record = maneuver({
      mode: "sequential",
      onFailure: "stop",
      steps: [
        { deviceId: "A", command: "x" },
        { deviceId: "B", command: "y" },
        { deviceId: "C", command: "z" },
      ],
    });
    const h = harness({ maneuvers: [record] });
    h.channel.execute
      .mockResolvedValueOnce({ deviceId: "A", command: "x", success: true })
      .mockResolvedValueOnce({ deviceId: "B", command: "y", success: false, reason: "hata" });
    const result = await h.executor.execute("maneuver", "pcs_charge");
    expect(result.status).toBe("failed");
    expect(calledDevices(h.channel)).toEqual(["A", "B"]);
  });

  it("onFailure continue: hata sonrası devam; sonuç failed", async () => {
    const record = maneuver({
      mode: "sequential",
      onFailure: "continue",
      steps: [
        { deviceId: "A", command: "x" },
        { deviceId: "B", command: "y" },
      ],
    });
    const h = harness({ maneuvers: [record] });
    h.channel.execute
      .mockResolvedValueOnce({ deviceId: "A", command: "x", success: false })
      .mockResolvedValueOnce({ deviceId: "B", command: "y", success: true });
    const result = await h.executor.execute("maneuver", "pcs_charge");
    expect(result.status).toBe("failed");
    expect(calledDevices(h.channel)).toEqual(["A", "B"]);
  });

  it("rollback: yalnızca BAŞARILI adımların kompanzasyonu, ters sıra", async () => {
    const record = maneuver({
      mode: "sequential",
      onFailure: "rollback",
      steps: [
        { deviceId: "A", command: "x" },
        { deviceId: "B", command: "y" },
        { deviceId: "C", command: "z" },
      ],
      rollbackSteps: [
        { deviceId: "A", command: "undo-a" },
        { deviceId: "B", command: "undo-b" },
        { deviceId: "C", command: "undo-c" },
      ],
    });
    const h = harness({ maneuvers: [record] });
    h.channel.execute
      .mockResolvedValueOnce({ deviceId: "A", command: "x", success: true })
      .mockResolvedValueOnce({ deviceId: "B", command: "y", success: true })
      .mockResolvedValueOnce({ deviceId: "C", command: "z", success: false })
      .mockResolvedValueOnce({ deviceId: "B", command: "undo-b", success: true })
      .mockResolvedValueOnce({ deviceId: "A", command: "undo-a", success: true });
    const result = await h.executor.execute("maneuver", "pcs_charge");
    expect(result.status).toBe("rolled_back");
    // kompanzasyon ters sırada, yalnızca başarılı adımlar (A, B)
    expect(calledDevices(h.channel)).toEqual(["A", "B", "C", "B", "A"]);
    expect(h.log).toHaveBeenCalledWith(
      expect.objectContaining({ eventCode: "operation_rolled_back" }),
    );
  });

  it("rollback best-effort: kompanzasyon hatası diğerlerini durdurmaz", async () => {
    const record = maneuver({
      mode: "parallel",
      onFailure: "rollback",
      steps: [
        { deviceId: "A", command: "x" },
        { deviceId: "B", command: "y" },
      ],
      rollbackSteps: [
        { deviceId: "A", command: "undo-a" },
        { deviceId: "B", command: "undo-b" },
      ],
    });
    const h = harness({ maneuvers: [record] });
    h.channel.execute
      .mockResolvedValueOnce({ deviceId: "A", command: "x", success: true })
      .mockResolvedValueOnce({ deviceId: "B", command: "y", success: false })
      .mockResolvedValueOnce({ deviceId: "A", command: "undo-a", success: false })
      .mockResolvedValueOnce({ deviceId: "B", command: "undo-b", success: true });
    const result = await h.executor.execute("maneuver", "pcs_charge");
    expect(result.status).toBe("rolled_back");
    expect(h.log).toHaveBeenCalledWith(
      expect.objectContaining({ eventCode: "rollback_step_failed" }),
    );
  });
});

describe("OperationExecutor — kalıcılık + timer", () => {
  it("begin FAIL-CLOSED: throw → rejected (run_persist_failed), kanal çalışmaz", async () => {
    const h = harness({ maneuvers: [maneuver()] });
    h.runs.begin.mockRejectedValue(new Error("pg yok"));
    const result = await h.executor.execute("maneuver", "pcs_charge", {
      powerKw: 100,
    });
    expect(result.status).toBe("rejected");
    expect(result.reason).toBe("run_persist_failed");
    expect(h.channel.execute).not.toHaveBeenCalled();
  });

  it("başarılı koşu: begin(running) → finish(completed) + audit zinciri", async () => {
    const h = harness({ maneuvers: [maneuver()] });
    const result = await h.executor.execute(
      "maneuver",
      "pcs_charge",
      { powerKw: 100 },
      { createdBy: "admin", traceId: "t-1", trigger: "manual" },
    );
    expect(result.status).toBe("completed");
    expect(h.runs.begin).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "run-1",
        kind: "maneuver",
        name: "pcs_charge",
        trigger: "manual",
        createdBy: "admin",
        traceId: "t-1",
      }),
    );
    expect(h.finished).toEqual([{ id: "run-1", status: "completed" }]);
    expect(h.log).toHaveBeenCalledWith(
      expect.objectContaining({ eventCode: "operation_started" }),
    );
    expect(h.log).toHaveBeenCalledWith(
      expect.objectContaining({ eventCode: "operation_completed" }),
    );
  });

  it("finish best-effort: throw → sonuç yine döner + operation_state_update_failed", async () => {
    const h = harness({ maneuvers: [maneuver()] });
    h.runs.finish.mockRejectedValue(new Error("pg yok"));
    const result = await h.executor.execute("maneuver", "pcs_charge", {
      powerKw: 100,
    });
    expect(result.status).toBe("completed");
    expect(h.log).toHaveBeenCalledWith(
      expect.objectContaining({ eventCode: "operation_state_update_failed" }),
    );
  });

  it("timer: başarılı adımda stop planlanır (best-effort + timer_scheduled)", async () => {
    const record = maneuver({
      steps: [
        {
          deviceId: "BSC-1",
          command: "charge",
          params: { powerKw: 50 },
          timer: { durationMs: 60000, stopCommand: "stop" },
        },
      ],
    });
    const h = harness({ maneuvers: [record] });
    await h.executor.execute("maneuver", "pcs_charge");
    expect(h.channel.schedule).toHaveBeenCalledWith(
      { deviceId: "BSC-1", command: "stop" },
      60000,
    );
    expect(h.log).toHaveBeenCalledWith(
      expect.objectContaining({ eventCode: "timer_scheduled" }),
    );
  });

  it("timer: ana komut BAŞARISIZSA planlama YAPILMAZ", async () => {
    const record = maneuver({
      steps: [
        {
          deviceId: "BSC-1",
          command: "charge",
          timer: { durationMs: 60000 },
        },
      ],
    });
    const h = harness({ maneuvers: [record] });
    h.channel.execute.mockResolvedValueOnce({
      deviceId: "BSC-1",
      command: "charge",
      success: false,
    });
    await h.executor.execute("maneuver", "pcs_charge");
    expect(h.channel.schedule).not.toHaveBeenCalled();
  });

  it("timer schedule hatası → timer_schedule_failed; akış durmaz", async () => {
    const record = maneuver({
      steps: [
        { deviceId: "BSC-1", command: "charge", timer: { durationMs: 60000 } },
      ],
    });
    const h = harness({ maneuvers: [record] });
    h.channel.schedule.mockRejectedValue(new Error("redis yok"));
    const result = await h.executor.execute("maneuver", "pcs_charge");
    expect(result.status).toBe("completed");
    expect(h.log).toHaveBeenCalledWith(
      expect.objectContaining({ eventCode: "timer_schedule_failed" }),
    );
  });
});

describe("OperationExecutor — operasyon yürütme", () => {
  it("manevra adımı + ham zincir adımı sırayla çalışır", async () => {
    const h = harness({
      maneuvers: [maneuver(), maneuver({ name: "pcs_stop" })],
      operations: [
        operation({
          onFailure: "stop",
          steps: [
            { maneuver: "pcs_charge", params: { powerKw: 200 } },
            {
              commands: [{ deviceId: "PCS-9", command: "set_power_zero" }],
              mode: "parallel",
            },
          ],
        }),
      ],
    });
    const result = await h.executor.execute("operation", "field_charge");
    expect(result.status).toBe("completed");
    expect(calledDevices(h.channel)).toEqual(["PCS-1", "PCS-2", "PCS-9"]);
  });

  it("uzak adım (system) B1'de kanal YOK → fail (kademeli bozulma)", async () => {
    const h = harness({
      operations: [
        operation({
          onFailure: "stop",
          steps: [
            { system: "container-1", maneuver: "bsc_prepare" },
            { maneuver: "pcs_stop" },
          ],
        }),
      ],
      maneuvers: [maneuver({ name: "pcs_stop", steps: [{ deviceId: "PCS-1", command: "stop" }] })],
    });
    const result = await h.executor.execute("operation", "field_charge");
    expect(result.status).toBe("failed");
    expect(result.outcomes[0]!.reason).toBe("remote_channel_not_available");
    expect(result.outcomes[0]!.system).toBe("container-1");
  });

  it("operasyon onFailure rollback: üst rollback listesi çalışır", async () => {
    const h = harness({
      maneuvers: [
        maneuver(),
        maneuver({
          name: "pcs_stop",
          steps: [{ deviceId: "PCS-1", command: "stop" }],
        }),
      ],
      operations: [
        operation({
          steps: [
            { maneuver: "pcs_charge", params: { powerKw: 200 } },
            { maneuver: "pcs_stop" },
          ],
          rollback: [{ maneuver: "pcs_stop" }],
        }),
      ],
    });
    // ikinci adım (pcs_stop manevrası) fail olsun
    h.channel.execute
      .mockResolvedValueOnce({ deviceId: "PCS-1", command: "charge", success: true })
      .mockResolvedValueOnce({ deviceId: "PCS-2", command: "charge", success: true })
      .mockResolvedValueOnce({ deviceId: "PCS-1", command: "stop", success: false })
      .mockResolvedValueOnce({ deviceId: "PCS-1", command: "stop", success: true });
    const result = await h.executor.execute("operation", "field_charge");
    expect(result.status).toBe("rolled_back");
    expect(h.log).toHaveBeenCalledWith(
      expect.objectContaining({ eventCode: "operation_rolled_back" }),
    );
  });
});

describe("OperationExecutor — uzak adım kanalı (Faz C)", () => {
  function remoteHarness() {
    const remoteExecute = vi.fn(async () => ({ ok: true }));
    const registry = new ManeuverRegistry({
      maneuvers: [maneuver(), maneuver({ name: "pcs_stop", steps: [{ deviceId: "PCS-1", command: "stop" }] })],
      operations: [
        operation({
          onFailure: "stop",
          steps: [{ system: "container-1", maneuver: "bsc_prepare" }],
        }),
      ],
    });
    const executor = new OperationExecutor({
      registry,
      targets: {
        resolveAvailable: async () => ["PCS-1"],
        filterAvailable: async (ids: string[]) => ids,
      },
      channel: {
        execute: async (s: ResolvedCommandStep): Promise<CommandStepResult> => ({
          deviceId: s.deviceId,
          command: s.command,
          success: true,
        }),
        schedule: async () => undefined,
      } as ICommandChannel,
      runs: {
        begin: async () => undefined,
        finish: async () => undefined,
      } as unknown as IOperationRunStore,
      remoteChannel: { execute: remoteExecute } as never,
      now: () => new Date("2026-09-22T10:00:00.000Z"),
      generateId: () => "run-1",
    });
    return { executor, remoteExecute };
  }

  it("remoteChannel VARSA uzak adım kanala delege edilir (param aktarımıyla)", async () => {
    const { executor, remoteExecute } = remoteHarness();
    const result = await executor.execute("operation", "field_charge", {
      powerKw: 200,
    });
    expect(result.status).toBe("completed");
    expect(remoteExecute).toHaveBeenCalledWith(
      "container-1",
      "bsc_prepare",
      expect.objectContaining({ powerKw: 200 }),
    );
  });

  it("uzak adım fail → operasyon failed (kademeli)", async () => {
    const { executor, remoteExecute } = remoteHarness();
    remoteExecute.mockResolvedValue({ ok: false, reason: "maneuver_not_found" });
    const result = await executor.execute("operation", "field_charge");
    expect(result.status).toBe("failed");
    expect(result.outcomes[0]!.reason).toBe("maneuver_not_found");
  });

  it("uzak rollback adımı: yalnızca BAŞARILI adımlar kompanse edilir (ok → rollback_step_ok)", async () => {
    const registry = new ManeuverRegistry({
      maneuvers: [maneuver()],
      operations: [
        operation({
          onFailure: "rollback",
          steps: [
            { system: "container-1", maneuver: "bsc_prepare" },
            { maneuver: "yok" },
          ],
          rollback: [
            { system: "container-1", maneuver: "bsc_stop" },
            { maneuver: "yok_geri" },
          ],
        }),
      ],
    });
    const remoteExecute = vi.fn(async () => ({ ok: true }));
    const log = vi.fn(async () => undefined);
    const executor = new OperationExecutor({
      registry,
      targets: { resolveAvailable: async () => [], filterAvailable: async (ids: string[]) => ids },
      channel: { execute: async () => ({ deviceId: "x", success: true }), schedule: async () => undefined } as ICommandChannel,
      runs: { begin: async () => undefined, finish: async () => undefined } as unknown as IOperationRunStore,
      remoteChannel: { execute: remoteExecute } as never,
      logger: { log } as never,
      now: () => new Date("2026-09-22T10:00:00.000Z"),
      generateId: () => "run-1",
    });

    // bsc_prepare (uzak) BAŞARILI; "yok" manevrası fail → rollback:
    // yalnızca başarılı adımın kompanzasyonu (bsc_stop) uzaktan çalışır.
    const result = await executor.execute("operation", "field_charge");
    expect(result.status).toBe("rolled_back");
    expect(remoteExecute).toHaveBeenLastCalledWith("container-1", "bsc_stop", {});
    expect(log).toHaveBeenCalledWith(
      expect.objectContaining({ eventCode: "rollback_step_ok" }),
    );
  });
});

describe("OperationExecutor — UI zamanlı çalıştırma (§10)", () => {
  it("options.timer TÜM yerel ana adımlara uygulanır; rollback adımlarına UYGULANMAZ", async () => {
    const registry = new ManeuverRegistry({
      maneuvers: [
        maneuver({
          onFailure: "rollback",
          steps: [
            { deviceId: "A", command: "x" },
            { deviceId: "B", command: "y" },
          ],
          rollbackSteps: [
            { deviceId: "A", command: "undo-a" },
          ],
        }),
      ],
    });
    const executed: ResolvedCommandStep[] = [];
    const executor = new OperationExecutor({
      registry,
      targets: { resolveAvailable: async () => [], filterAvailable: async (ids: string[]) => ids },
      channel: {
        execute: async (s: ResolvedCommandStep): Promise<CommandStepResult> => {
          executed.push(s);
          return { deviceId: s.deviceId, command: s.command, success: true };
        },
        schedule: async () => undefined,
      } as ICommandChannel,
      runs: { begin: async () => undefined, finish: async () => undefined } as unknown as IOperationRunStore,
      now: () => new Date("2026-09-22T10:00:00.000Z"),
      generateId: () => "run-1",
    });

    const result = await executor.execute("maneuver", "pcs_charge", {}, {
      timer: { durationSeconds: 60 },
    });
    expect(result.status).toBe("completed");
    expect(executed.every((s) => s.timer?.durationMs === 60000)).toBe(true);
  });

  it("kayıt adımının kendi timer'ı options.timer'ı EZER", async () => {
    const registry = new ManeuverRegistry({
      maneuvers: [
        maneuver({
          steps: [
            { deviceId: "A", command: "x", timer: { durationMs: 9000, stopCommand: "stop" } },
          ],
        }),
      ],
    });
    const executed: ResolvedCommandStep[] = [];
    const executor = new OperationExecutor({
      registry,
      targets: { resolveAvailable: async () => [], filterAvailable: async (ids: string[]) => ids },
      channel: {
        execute: async (s: ResolvedCommandStep): Promise<CommandStepResult> => {
          executed.push(s);
          return { deviceId: s.deviceId, command: s.command, success: true };
        },
        schedule: async () => undefined,
      } as ICommandChannel,
      runs: { begin: async () => undefined, finish: async () => undefined } as unknown as IOperationRunStore,
      now: () => new Date("2026-09-22T10:00:00.000Z"),
      generateId: () => "run-1",
    });
    await executor.execute("maneuver", "pcs_charge", {}, {
      timer: { durationSeconds: 60 },
    });
    expect(executed[0]!.timer).toEqual({ durationMs: 9000, stopCommand: "stop" });
  });
});
